import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0'
import { isKeyForChore, signDownload } from '../_shared/s3.ts'
import { HttpError, corsHeaders, errorResponse, json, readJson } from '../_shared/http.ts'

//returns short-lived signed links for a chore's photos
//body: { choreId } -> { urls: { [imageKey]: signedUrl } }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { choreId } = await readJson(req)
    if (!choreId) throw new HttpError(400, 'choreId is required')

    //acts as the caller, so chore_analysis's rls policies decide whose photos they can see
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new HttpError(401, 'not authenticated')

    const { data: rows, error } = await supabase
      .from('chore_analysis')
      .select('before_image_key, after_image_key')
      .eq('chore_id', choreId)
    if (error) throw error

    const keys = new Set<string>()
    for (const row of rows ?? []) {
      for (const key of [row.before_image_key, row.after_image_key]) {
        if (isKeyForChore(key, choreId)) keys.add(key)
      }
    }

    const urls: Record<string, string> = {}
    await Promise.all([...keys].map(async (key) => { urls[key] = await signDownload(key) }))

    return json({ urls })
  } catch (error) {
    return errorResponse('get-photo-urls', error)
  }
})
