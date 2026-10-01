import { RekognitionClient, DetectLabelsCommand } from "https://esm.sh/@aws-sdk/client-rekognition@3.433.0"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      MaxLabels: 10,
      MinConfidence: 85, //only return things it is #% sure about
    })

    const response = await client.send(command)
    const labels = response.Labels?.map(l => l.Name) || []

    //check for match
    const isMatch = labels.some(l => l.toLowerCase().includes(target.toLowerCase()))
    const resultFeedback = isMatch 
      ? `good job! i confirmed the ${target.toLowerCase()} is present.` 
      : `i see ${labels.slice(0,2).join(' ')}, but no ${target.toLowerCase()}. try again!`;

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

    //increment attempt_number on the main chore row
    await supabase.rpc('increment_chore_attempts', { target_chore_id: choreId })

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