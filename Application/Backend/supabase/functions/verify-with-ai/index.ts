import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0'
import { isKeyForChore, signDownload } from '../_shared/s3.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'

//the frontend always names uploads *.jpg and claims Content-Type: image/jpeg
//regardless of what was actually captured - true on native (the camera
//really does produce JPEG), but expo-camera's web fallback captures via
//canvas and returns PNG, so the bytes don't match the label. Claude's API
//rejects a mismatched media_type outright, so detect it from the real
//magic bytes instead of trusting the filename/header.
function detectMediaType(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif'
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return 'image/webp'
  return 'image/jpeg'
}

//strips a ```json ... ``` fence if Claude wraps its answer in one despite
//being told not to - cheap insurance, not load-bearing for the happy path
function parseClaudeJson(rawText: string) {
  const cleaned = rawText.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  return JSON.parse(cleaned)
}

//custom error class to carry an HTTP status code for the response
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { choreId, logId } = await req.json()
    if (!choreId || !logId) throw new HttpError(400, 'choreId and logId are required') //bad request

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    //authenticate the kid via their jwt
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt)
    if (userError || !user) throw new HttpError(401, 'not authenticated')

    const { data: chore } = await supabase
      .from('chores')
      .select('title, description, target_label, assigned_to, status')
      .eq('id', choreId)
      .single()
    if (!chore) throw new HttpError(404, 'chore not found')
    
    //the chore must be assigned to this kid and must be waiting for an after photo
    if (chore.assigned_to !== user.id) throw new HttpError(403, 'this chore is not assigned to you')
    if (chore.status !== 'pending') throw new HttpError(409, 'this chore is not waiting for an after photo')

    //this attempt's before photo - compared against it instead of judging
    //the after photo in isolation, so re-submitting the same (or similar)
    //photo as both before and after doesn't pass
    const { data: analysisRow } = await supabase
      .from('chore_analysis')
      .select('chore_id, before_image_key, after_image_key, ai_detected_label')
      .eq('id', logId)
      .single()

    //the log entry must exist and must belong to this chore, and must have an
    if (!analysisRow || String(analysisRow.chore_id) !== String(choreId)) {
      throw new HttpError(403, 'this attempt does not belong to this chore')
    }
    if (!analysisRow.after_image_key) throw new HttpError(409, 'no after photo on this attempt')
    if (analysisRow.ai_detected_label) throw new HttpError(409, 'this attempt was already checked')

    //keep the keys for this chore separate
    if (!isKeyForChore(analysisRow.after_image_key, choreId)) throw new HttpError(403, 'after photo does not belong to this chore')
    if (analysisRow.before_image_key && !isKeyForChore(analysisRow.before_image_key, choreId)) {
      throw new HttpError(403, 'before photo does not belong to this chore')
    }

    //the bucket is private - fetch through a short-lived signed link, then base64-encode the bytes
    const fetchImage = async (key: string) => {
      const res = await fetch(await signDownload(key, 60))
      if (!res.ok) throw new Error(`could not fetch ${key} from S3 (status ${res.status})`)
      const bytes = new Uint8Array(await res.arrayBuffer())
      return { base64: encodeBase64(bytes), mediaType: detectMediaType(bytes) }
    }

    const after = await fetchImage(analysisRow.after_image_key)
    const before = analysisRow?.before_image_key ? await fetchImage(analysisRow.before_image_key) : null

    const choreLabel = chore?.title || chore?.target_label || 'this chore'

    const content: Record<string, unknown>[] = []
    if (before) {
      content.push({ type: 'text', text: 'BEFORE photo:' })
      content.push({ type: 'image', source: { type: 'base64', media_type: before.mediaType, data: before.base64 } })
    }
    content.push({ type: 'text', text: 'AFTER photo:' })
    content.push({ type: 'image', source: { type: 'base64', media_type: after.mediaType, data: after.base64 } })
    content.push({
      type: 'text',
      text: `A kid is doing this chore: "${choreLabel}"${chore?.description ? ` (${chore.description})` : ''}.\n` +
        (before
          ? 'Compare the BEFORE and AFTER photos above very carefully, looking specifically for the exact change this chore requires (an item removed, a mess cleared, an area tidied, etc.) - not just "does the after photo look fine in general".'
          : 'Judge whether the AFTER photo above shows the chore has been completed.') +
        '\nRespond with ONLY a JSON object and nothing else, no code fence: ' +
        '{"reasoning": "one sentence: what specifically, if anything, is different between the two photos relevant to this chore", ' +
        '"isMatch": true or false, "confidence": a number 0-100 for how sure you are, ' +
        '"feedback": "one short, encouraging, kid-friendly sentence - if isMatch is false, briefly say what still needs doing; if true, a short congratulations"}\n' +
        'Rules: if the BEFORE and AFTER photos look the same or nearly the same, or show an unrelated/reused photo, you MUST set isMatch to false. ' +
        'If you are not confident a real, relevant change happened, default to isMatch: false - it is better to ask the kid to retake the photo than to approve a chore that was not actually done.',
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
    let reasoning = ''
    try {
      const parsed = parseClaudeJson(rawText)
      isMatch = !!parsed.isMatch
      confidence = typeof parsed.confidence === 'number' ? parsed.confidence : (isMatch ? 100 : 0)
      feedback = typeof parsed.feedback === 'string' ? parsed.feedback : feedback
      reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : ''
    } catch (e) {
      console.error('could not parse claude response:', rawText)
    }

    //reasoning isn't persisted anywhere - logged only, for debugging false
    //positives/negatives against the edge function's own logs
    console.log(`chore: ${choreLabel} | isMatch: ${isMatch} | confidence: ${confidence} | reasoning: ${reasoning}`)

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
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: error instanceof HttpError ? error.status : 400 }
    )
  }
})
