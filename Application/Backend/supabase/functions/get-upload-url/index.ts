import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0'
import { MAX_PHOTO_BYTES, PHOTO_TYPES, newPhotoKey, signUpload, type PhotoType } from '../_shared/s3.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

//the before photo starts a todo chore, the after photo finishes a pending one
const STATUS_FOR_KIND = { before: 'todo', after: 'pending' } as const

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { choreId, kind, contentType, size } = await req.json()
    if (!choreId || !(kind in STATUS_FOR_KIND)) throw new HttpError(400, "choreId and kind ('before' | 'after') are required")
    if (!(contentType in PHOTO_TYPES)) throw new HttpError(400, "contentType must be 'image/jpeg' or 'image/png'")
    if (!Number.isInteger(size) || size <= 0) throw new HttpError(400, 'size (in bytes) is required')
    if (size > MAX_PHOTO_BYTES) throw new HttpError(413, 'photo is too large (max 5 MB)')

    //acts as the caller, so rls decides which chores they can see
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new HttpError(401, 'not authenticated')

    const { data: chore } = await supabase
      .from('chores')
      .select('assigned_to, status')
      .eq('id', choreId)
      .maybeSingle()
    if (!chore) throw new HttpError(404, 'chore not found')
    if (chore.assigned_to !== user.id) throw new HttpError(403, 'this chore is not assigned to you')
    if (chore.status !== STATUS_FOR_KIND[kind as keyof typeof STATUS_FOR_KIND]) {
      throw new HttpError(409, `this chore is not waiting for a ${kind} photo`)
    }

    //the server picks the key - the client just uploads to it and stores it
    const key = newPhotoKey(choreId, kind, contentType as PhotoType)
    const uploadUrl = await signUpload(key, contentType as PhotoType, size)

    return new Response(
      JSON.stringify({ uploadUrl, key }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('get-upload-url error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: error instanceof HttpError ? error.status : 400 }
    )
  }
})
