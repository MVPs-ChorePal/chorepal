import { RekognitionClient, DetectLabelsCommand } from "https://esm.sh/@aws-sdk/client-rekognition@3.433.0"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    //get input from the phone
    const { fileName, choreId } = await req.json()

    //initialize Supabase
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

    const target = chore?.target_label || "Object";

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

    //verification logic
    const isMatch = labels.some(l => l.toLowerCase().includes(target.toLowerCase()));
    
    let feedback = "";
    if (isMatch) {
      feedback = `success!  ${target.toLowerCase()} is present.`;
    } else {
      const seen = labels.slice(0, 2).join(" and ").toLowerCase();
      feedback = `try again!`;
    }

    //record attempt
    const { error: insertError } = await supabase
      .from('chore_analysis')
      .insert({
        chore_id: choreId,
        after_image_key: fileName,
        ai_detected_label: labels[0] || 'Unknown',
        ai_feedback: feedback,
        needs_revision: !isMatch,
        ai_confidence_score: response.Labels?.[0]?.Confidence || 0
      })

    if (insertError) throw insertError

    //return the result
    return new Response(
      JSON.stringify({ isMatch, feedback, labels }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )

  } catch (error) {
    console.error(`AI Error: ${error.message}`)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    )
  }
})