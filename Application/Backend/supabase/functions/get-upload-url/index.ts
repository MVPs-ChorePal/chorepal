import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0'
import { MAX_PHOTO_BYTES, PHOTO_TYPES, newPhotoKey, signUpload, type PhotoType } from '../_shared/s3.ts'
import { HttpError, json, readJson, serve } from '../_shared/http.ts'

//the before photo starts a todo chore, the after photo finishes a pending one
const STATUS_FOR_KIND = { before: 'todo', after: 'pending' } as const

serve('get-upload-url', async (req) => {
  const { choreId, kind, contentType, size } = await readJson(req)
  if (!choreId || !Object.hasOwn(STATUS_FOR_KIND, kind)) throw new HttpError(400, "choreId and kind ('before' | 'after') are required")
  if (!Object.hasOwn(PHOTO_TYPES, contentType)) throw new HttpError(400, "contentType must be 'image/jpeg' or 'image/png'")
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

  const { data: chore, error: choreError } = await supabase
    .from('chores')
    .select('assigned_to, status')
    .eq('id', choreId)
    .maybeSingle()
  if (choreError) throw choreError
  if (!chore) throw new HttpError(404, 'chore not found')
  if (chore.assigned_to !== user.id) throw new HttpError(403, 'this chore is not assigned to you')
  if (chore.status !== STATUS_FOR_KIND[kind as keyof typeof STATUS_FOR_KIND]) {
    throw new HttpError(409, `this chore is not waiting for a ${kind} photo`)
  }

  //the server picks the key - the client just uploads to it and stores it
  const key = newPhotoKey(choreId, kind, contentType as PhotoType)
  const uploadUrl = await signUpload(key, contentType as PhotoType, size)

  return json({ uploadUrl, key })
})
