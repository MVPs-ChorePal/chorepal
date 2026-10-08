import { RekognitionClient, DetectLabelsCommand } from "https://esm.sh/@aws-sdk/client-rekognition@3.433.0"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

//rekognition rarely returns the exact category name, so each chore category
//accepts any of these words (keys are the target_label values from create-chore)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Dishware': ['dishware', 'dish', 'plate', 'bowl', 'cup', 'mug', 'glass', 'cutlery', 'fork', 'spoon', 'knife', 'utensil', 'tableware', 'pottery', 'sink', 'dishwasher', 'kitchen', 'counter', 'countertop'],
  'Plant': ['plant', 'grass', 'lawn', 'yard', 'backyard', 'garden', 'gardening', 'tree', 'leaf', 'vegetation', 'flower', 'shrub', 'hedge', 'outdoors', 'nature', 'potted plant'],
  'Clothing': ['clothing', 'apparel', 'shirt', 't-shirt', 'pants', 'jeans', 'shorts', 'sock', 'dress', 'coat', 'jacket', 'sweater', 'laundry', 'towel', 'fabric', 'closet', 'hanger', 'wardrobe'],
  'Bed': ['bed', 'bedroom', 'pillow', 'cushion', 'blanket', 'mattress', 'bedding', 'linen', 'quilt', 'duvet', 'bed sheet', 'furniture'],
  'Animal': ['animal', 'pet', 'dog', 'puppy', 'cat', 'kitten', 'mammal', 'canine', 'bird', 'fish', 'rabbit', 'hamster', 'pet bowl'],
  'Waste Container': ['waste container', 'trash', 'trash can', 'garbage', 'garbage can', 'bin', 'can', 'tin', 'waste', 'recycling', 'recycling bin', 'dumpster', 'rubbish', 'litter', 'bag', 'plastic bag'],
}

//whole-word match so "can" matches "trash can" but not "candle"
const matchesKeyword = (label: string, keyword: string) => {
  const text = label.toLowerCase()
  return text === keyword || ` ${text} `.includes(` ${keyword} `)
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

    const target = chore?.target_label || "Object"

    //initialize aws rekognition
    const client = new RekognitionClient({
      region: Deno.env.get('MY_AWS_REGION'),
      credentials: {
        accessKeyId: Deno.env.get('MY_AWS_ACCESS_KEY_ID')!,
        secretAccessKey: Deno.env.get('MY_AWS_SECRET_ACCESS_KEY')!,
      },
    })

    const command = new DetectLabelsCommand({
      Image: {
        S3Object: {
          Bucket: Deno.env.get('MY_AWS_S3_BUCKET_NAME'),
          Name: fileName,
        },
      },
      MaxLabels: 25,
      MinConfidence: 70, //only return things it is #% sure about
    })

    const response = await client.send(command)
    const labels = response.Labels?.map(l => l.Name) || []

    //check each label plus its aliases and parent categories (e.g. "Trash Can" -> "Container")
    const candidates = (response.Labels || []).flatMap(l => [
      l.Name,
      ...(l.Aliases || []).map(a => a.Name),
      ...(l.Parents || []).map(p => p.Name),
    ]).filter(Boolean) as string[]

    const keywords = CATEGORY_KEYWORDS[target] || [target.toLowerCase()]
    const matchedLabel = candidates.find(c => keywords.some(k => matchesKeyword(c, k)))
    const isMatch = !!matchedLabel
    console.log(`target: ${target} | labels: ${labels.join(', ')} | matched: ${matchedLabel ?? 'none'}`)

    const resultFeedback = isMatch
      ? `good job! i spotted ${matchedLabel!.toLowerCase()}, so this looks done.`
      : `i see ${labels.slice(0, 3).join(', ').toLowerCase() || 'nothing clear'}, but nothing that matches this chore. try again!`;

    //update the history log (pinpoint accuracy with logId)
    const { error: analysisError } = await supabase
      .from('chore_analysis')
      .update({
        ai_detected_label: labels[0] || 'unknown',
        ai_confidence_score: response.Labels?.[0]?.Confidence || 0,
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