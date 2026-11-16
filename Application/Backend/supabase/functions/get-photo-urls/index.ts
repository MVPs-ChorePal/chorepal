import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0'
import { isKeyForChore, signDownload } from '../_shared/s3.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

//returns short-lived signed links for a chore's photos
//body: { choreId } -> { urls: { [imageKey]: signedUrl } }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { choreId } = await req.json()
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

    return new Response(
      JSON.stringify({ urls }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('get-photo-urls error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: error instanceof HttpError ? error.status : 400 }
    )
  }
})
