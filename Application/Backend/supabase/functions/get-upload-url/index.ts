import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.433.0"
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.433.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Deno.serve is the modern way to write Supabase functions
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fileName, fileType } = await req.json()
    console.log(`Generating URL for: ${fileName}`)

    const client = new S3Client({
      region: Deno.env.get('MY_AWS_REGION'),
      credentials: {
        accessKeyId: Deno.env.get('MY_AWS_ACCESS_KEY_ID')!,
        secretAccessKey: Deno.env.get('MY_AWS_SECRET_ACCESS_KEY')!,
      },
    })

    const command = new PutObjectCommand({
      Bucket: Deno.env.get('MY_AWS_S3_BUCKET_NAME'),
      Key: fileName,
      ContentType: fileType,
    })

    // URL expires in 5 minutes (300 seconds)
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 })

    return new Response(
      JSON.stringify({ uploadUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  } catch (error) {
    console.error("Function Error:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    )
  }
})