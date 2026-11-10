import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'

//strips a ```json ... ``` fence if Claude wraps its answer in one despite
//being told not to - cheap insurance, not load-bearing for the happy path
function parseClaudeJson(rawText: string) {
  const cleaned = rawText.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  return JSON.parse(cleaned)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { fileName, choreId, logId } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: chore } = await supabase
      .from('chores')
      .select('title, description, target_label')
      .eq('id', choreId)
      .single()

    //this attempt's before photo - compared against it instead of judging
    //the after photo in isolation, so re-submitting the same (or similar)
    //photo as both before and after doesn't pass
    const { data: analysisRow } = await supabase
      .from('chore_analysis')
      .select('before_image_key')
      .eq('id', logId)
      .single()

    const bucket = Deno.env.get('MY_AWS_S3_BUCKET_NAME')
    const region = Deno.env.get('MY_AWS_REGION')
    const s3Url = (key: string) => `https://${bucket}.s3.${region}.amazonaws.com/${key}`

    //the bucket serves uploaded photos over plain public HTTPS (same URLs
    //the app itself displays photos from), so no AWS credentials are
    //needed here - just fetch the bytes and base64-encode them for Claude
    const fetchImageBase64 = async (key: string) => {
      const res = await fetch(s3Url(key))
      if (!res.ok) throw new Error(`could not fetch ${key} from S3 (status ${res.status})`)
      return encodeBase64(new Uint8Array(await res.arrayBuffer()))
    }

    const afterBase64 = await fetchImageBase64(fileName)
    const beforeBase64 = analysisRow?.before_image_key ? await fetchImageBase64(analysisRow.before_image_key) : null

    const choreLabel = chore?.title || chore?.target_label || 'this chore'

    const content: Record<string, unknown>[] = []
    if (beforeBase64) {
      content.push({ type: 'text', text: 'BEFORE photo:' })
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: beforeBase64 } })
    }
    content.push({ type: 'text', text: 'AFTER photo:' })
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: afterBase64 } })
    content.push({
      type: 'text',
      text: `A kid is doing this chore: "${choreLabel}"${chore?.description ? ` (${chore.description})` : ''}.\n` +
        (beforeBase64
          ? 'Compare the BEFORE and AFTER photos above and judge whether the chore was actually completed - the AFTER photo should show a real, visible improvement over the BEFORE photo (mess cleared, item put away, area tidied, etc.), not just the same scene, an unrelated photo, or a reused/duplicate image.'
          : 'Judge whether the AFTER photo above shows the chore has been completed.') +
        '\nRespond with ONLY a JSON object and nothing else, no code fence: ' +
        '{"isMatch": true or false, "confidence": a number 0-100 for how sure you are, ' +
        '"feedback": "one short, encouraging, kid-friendly sentence - if isMatch is false, briefly say what still needs doing; if true, a short congratulations"}',
    })

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 300,
        messages: [{ role: 'user', content }],
      }),
    })

    if (!aiRes.ok) throw new Error(`Claude API error ${aiRes.status}: ${await aiRes.text()}`)

    const aiJson = await aiRes.json()
    const rawText = aiJson.content?.[0]?.text ?? '{}'

    let isMatch = false
    let confidence = 0
    let feedback = "hmm, something went wrong checking this photo. try again!"
    try {
      const parsed = parseClaudeJson(rawText)
      isMatch = !!parsed.isMatch
      confidence = typeof parsed.confidence === 'number' ? parsed.confidence : (isMatch ? 100 : 0)
      feedback = typeof parsed.feedback === 'string' ? parsed.feedback : feedback
    } catch (e) {
      console.error('could not parse claude response:', rawText)
    }

    console.log(`chore: ${choreLabel} | isMatch: ${isMatch} | confidence: ${confidence}`)

    //update the history log (pinpoint accuracy with logId)
    const { error: analysisError } = await supabase
      .from('chore_analysis')
      .update({
        ai_detected_label: isMatch ? 'match' : 'no match',
        ai_confidence_score: confidence,
        ai_feedback: feedback,
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
      JSON.stringify({ isMatch, feedback }),
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
