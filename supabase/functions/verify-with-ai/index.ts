import { RekognitionClient, DetectLabelsCommand } from "https://esm.sh/@aws-sdk/client-rekognition@3.433.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { fileName } = await req.json()
    console.log(`Analyzing image: ${fileName}`)

    const client = new RekognitionClient({
      region: Deno.env.get('MY_AWS_REGION'),
      credentials: {
        accessKeyId: Deno.env.get('MY_AWS_ACCESS_KEY_ID')!,
        secretAccessKey: Deno.env.get('MY_AWS_SECRET_ACCESS_KEY')!,
      },
    })

    //detect labels using rekognition
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
    
    //extract just the label names
    const labels = response.Labels?.map(l => l.Name) || []
    console.log(`AI found: ${labels.join(', ')}`)

    return new Response(
      JSON.stringify({ labels }),
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