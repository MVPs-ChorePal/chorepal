import { RekognitionClient, DetectLabelsCommand } from "https://esm.sh/@aws-sdk/client-rekognition@3.433.0"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

//rekognition rarely returns the exact category name, so each chore category
//accepts any of these words (keys are the target_label values from create-chore).
//'Other' maps to null - there's no specific object to look for, so any
//detected label counts as evidence something changed in the photo.
const CATEGORY_KEYWORDS: Record<string, string[] | null> = {
  'Dishware': ['dishware', 'dish', 'plate', 'bowl', 'cup', 'mug', 'glass', 'cutlery', 'fork', 'spoon', 'knife', 'utensil', 'sink', 'dishwasher', 'kitchen', 'counter', 'countertop'],
  'Plant': ['plant', 'grass', 'lawn', 'yard', 'backyard', 'garden', 'gardening', 'tree', 'leaf', 'vegetation', 'flower', 'shrub', 'hedge', 'outdoors', 'nature', 'potted plant'],
  'Clothing': ['clothing', 'apparel', 'shirt', 't-shirt', 'pants', 'jeans', 'shorts', 'sock', 'dress', 'coat', 'jacket', 'sweater', 'laundry', 'towel', 'fabric', 'closet', 'hanger', 'wardrobe'],
  'Bed': ['bed', 'bedroom', 'pillow', 'cushion', 'blanket', 'mattress', 'bedding', 'linen', 'quilt', 'duvet', 'bed sheet'],
  'Animal': ['animal', 'pet', 'dog', 'puppy', 'cat', 'kitten', 'mammal', 'canine', 'bird', 'fish', 'rabbit', 'hamster', 'pet bowl'],
  'Waste Container': ['waste container', 'trash', 'trash can', 'garbage', 'garbage can', 'bin', 'can', 'tin', 'waste', 'recycling', 'recycling bin', 'dumpster', 'rubbish', 'litter', 'bag', 'plastic bag'],
  'Other': null,
}

//whole-word match so "can" matches "trash can" but not "candle"
const matchesKeyword = (label: string, keyword: string) => {
  const text = label.toLowerCase()
  return text === keyword || ` ${text} `.includes(` ${keyword} `)
}

//every name a label can be matched by: itself, its aliases, and its parent
//categories (e.g. "Trash Can" -> "Container")
const namesFor = (label: any) =>
  [label.Name, ...(label.Aliases || []).map((a: any) => a.Name), ...(label.Parents || []).map((p: any) => p.Name)].filter(Boolean)

//how much "evidence" of the target category is visible in a photo: the sum of
//detected instances (bounding boxes) across every matching label, or 1 per
//matching label when rekognition doesn't give individual instances.
//keywords === null means "anything counts" (the 'Other' category has no
//specific object to look for), so every detected label is evidence.
function evidenceScore(labels: any[], keywords: string[] | null) {
  let score = 0
  let topMatch: string | null = null
  for (const l of labels) {
    const matched = keywords === null || namesFor(l).some((n: string) => keywords.some(k => matchesKeyword(n, k)))
    if (!matched) continue
    score += l.Instances?.length || 1
    if (!topMatch) topMatch = l.Name
  }
  return { score, topMatch }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { fileName, choreId, logId } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    //fetch what the ai is supposed to be looking for
    const { data: chore } = await supabase
      .from('chores')
      .select('target_label')
      .eq('id', choreId)
      .single()

    const target = chore?.target_label || 'Other'
    const keywords = target in CATEGORY_KEYWORDS ? CATEGORY_KEYWORDS[target] : [target.toLowerCase()]

    //fetch this attempt's before photo - we compare against it instead of
    //just checking the after photo in isolation, so re-submitting the same
    //photo (or one that looks the same) doesn't pass
    const { data: analysisRow } = await supabase
      .from('chore_analysis')
      .select('before_image_key')
      .eq('id', logId)
      .single()

    const bucket = Deno.env.get('MY_AWS_S3_BUCKET_NAME')
    const client = new RekognitionClient({
      region: Deno.env.get('MY_AWS_REGION'),
      credentials: {
        accessKeyId: Deno.env.get('MY_AWS_ACCESS_KEY_ID')!,
        secretAccessKey: Deno.env.get('MY_AWS_SECRET_ACCESS_KEY')!,
      },
    })

    const detect = async (key: string) => {
      const response = await client.send(new DetectLabelsCommand({
        Image: { S3Object: { Bucket: bucket, Name: key } },
        MaxLabels: 25,
        MinConfidence: 90, //only return things it is #% sure about
      }))
      return response.Labels || []
    }

    const afterLabels = await detect(fileName)
    const after = evidenceScore(afterLabels, keywords)

    //compare against the before photo when we have one (every attempt should)
    //falling back to a presence-only check if it's ever missing, rather than
    //block the chore on a technicality
    const beforeLabels = analysisRow?.before_image_key ? await detect(analysisRow.before_image_key) : []
    const before = evidenceScore(beforeLabels, keywords)

    console.log(`target: ${target} | before: ${before.score} [${beforeLabels.map(l => l.Name).join(', ')}] | after: ${after.score} [${afterLabels.map(l => l.Name).join(', ')}]`)

    const isMatch = before.score > 0
      ? after.score < before.score
      : after.score > 0

    const resultFeedback = isMatch
      ? (target === 'Other'
          ? `nice work, this looks different from your before photo!`
          : `good job! looks like the ${(after.topMatch || target).toLowerCase()} situation improved, this looks done.`)
      : (before.score > 0
          ? `hmm, this still looks about the same as your before photo. finish up and try again!`
          : `i don't see anything that matches this chore yet. try again!`)

    //update the history log (pinpoint accuracy with logId)
    const { error: analysisError } = await supabase
      .from('chore_analysis')
      .update({
        ai_detected_label: after.topMatch || afterLabels[0]?.Name || 'unknown',
        ai_confidence_score: afterLabels[0]?.Confidence || 0,
        ai_feedback: resultFeedback,
        needs_revision: !isMatch
      })
      .eq('id', logId)

    if (analysisError) throw analysisError

    //the ai decides the status: only move to completed if match is true
    if (isMatch) {
      await supabase.from('chores').update({
        status: 'completed',
        ai_verified: true,
        submitted_at: new Date().toISOString()
      }).eq('id', choreId)
    } else {
      //force status to stay pending if ai fails
      await supabase.from('chores').update({
        status: 'pending',
        ai_verified: false
      }).eq('id', choreId)
    }

    return new Response(
      JSON.stringify({ isMatch, feedback: resultFeedback }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )

  } catch (error) {
    console.error(`ai function error: ${error.message}`)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    )
  }
})
