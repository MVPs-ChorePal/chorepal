import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0'
import { HttpError, json, readJson, serve } from '../_shared/http.ts'
import { sendMail } from '../_shared/mail.ts'

//updates the signed-in parent's name, email and phone number.
//body: { displayName?, email?, phone?, currentPassword? }
//  - email and phone changes take effect immediately (no confirmation link),
//    so they require the current password - a stolen or unlocked session
//    alone can't take the account over
//  - name lives on public.users; email and phone live on the auth user
//    (users.email is kept in sync by the sync_user_email trigger)
//  - the saved values are read back and returned, so the app only reports
//    success for what is actually stored
//  - the account is emailed about every change (old AND new address for an
//    email change), and an email change signs out every other session

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

//accepts what people type - "(555) 123-4567", "+44 7700 900123" - and returns
//E.164 digits without the "+" (how Supabase Auth stores phones), or "" to remove
function normalizePhone(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  const invalid = new HttpError(400, 'enter a valid phone number, e.g. 3475551234 or +44 7700 900123')
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) throw invalid
  const digits = trimmed.replace(/\D/g, '')
  let e164: string
  if (trimmed.startsWith('+')) e164 = digits                                      //international, country code given
  else if (digits.length === 10) e164 = `1${digits}`                             //US/Canada without the 1
  else if (digits.length === 11 && digits.startsWith('1')) e164 = digits         //US/Canada with the 1
  else throw invalid                                                             //e.g. a mistyped 9-digit number
  if (!/^[1-9]\d{7,14}$/.test(e164)) throw invalid
  return e164
}

serve('update-profile', async (req) => {
  const body = await readJson(req)

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
  const { data: { user }, error: userError } = await admin.auth.getUser(jwt)
  if (userError || !user) throw new HttpError(401, 'not authenticated')

  const { data: profile, error: profileError } = await admin
    .from('users').select('role, display_name').eq('id', user.id).maybeSingle()
  if (profileError) throw profileError
  if (!profile) throw new HttpError(404, 'profile not found')
  //children's login email is a hidden address that routes their password
  //resets to the parent - they don't manage it themselves
  if (profile.role !== 'parent') throw new HttpError(403, 'only parents can edit their profile here')

  //work out what is actually changing
  const changes: { displayName?: string; email?: string; phone?: string } = {}

  if (body.displayName !== undefined) {
    if (typeof body.displayName !== 'string') throw new HttpError(400, 'name must be text')
    const name = body.displayName.trim().replace(/\s+/g, ' ')
    if (name.length < 1 || name.length > 60) throw new HttpError(400, 'name must be 1-60 characters')
    if (name !== (profile.display_name ?? '')) changes.displayName = name
  }

  if (body.email !== undefined) {
    if (typeof body.email !== 'string') throw new HttpError(400, 'email must be text')
    const email = body.email.trim().toLowerCase()
    if (email.length > 254 || !EMAIL_RE.test(email)) throw new HttpError(400, 'enter a valid email address')
    if (email.endsWith('@chorepal.internal')) throw new HttpError(400, 'enter a valid email address')
    if (email !== (user.email ?? '').toLowerCase()) changes.email = email
  }

  if (body.phone !== undefined) {
    if (typeof body.phone !== 'string') throw new HttpError(400, 'phone must be text')
    const phone = normalizePhone(body.phone)
    if (phone !== (user.phone ?? '')) changes.phone = phone
  }

  if (Object.keys(changes).length === 0) throw new HttpError(400, 'nothing to change')

  //email/phone: confirm it's really the account owner
  if (changes.email !== undefined || changes.phone !== undefined) {
    if (typeof body.currentPassword !== 'string' || !body.currentPassword) {
      throw new HttpError(400, 'enter your current password to change your email or phone')
    }
    const verifier = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error: pwError } = await verifier.auth.signInWithPassword({ email: user.email ?? '', password: body.currentPassword })
    if (pwError) throw new HttpError(403, 'current password is incorrect')
    //drop the session that check just created
    await verifier.auth.signOut({ scope: 'local' })
  }

  //another account already using it? (Auth's admin API only reports this as a generic 500)
  if (changes.email !== undefined || changes.phone) {
    const { data: taken, error: takenError } = await admin.rpc('auth_identifier_taken', {
      p_user: user.id, p_email: changes.email ?? null, p_phone: changes.phone ?? null,
    })
    if (takenError) throw takenError
    if (taken) throw new HttpError(409, `that ${taken === 'email' ? 'email' : 'phone number'} is already used by another account`)
  }

  //save
  if (changes.displayName !== undefined) {
    const { error } = await admin.from('users').update({ display_name: changes.displayName }).eq('id', user.id)
    if (error) throw error
  }

  //email, and a new phone number, go through Auth's admin API (marked confirmed - no link sent)
  const attrs: Record<string, unknown> = {}
  if (changes.email !== undefined) Object.assign(attrs, { email: changes.email, email_confirm: true })
  if (changes.phone) Object.assign(attrs, { phone: changes.phone, phone_confirm: true })
  if (Object.keys(attrs).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(user.id, attrs)
    if (error) throw error
  }
  //the admin API ignores an empty phone, so removing one goes through the helper
  if (changes.phone === '') {
    const { error } = await admin.rpc('clear_auth_phone', { p_user: user.id })
    if (error) throw error
  }

  //read back what is actually stored
  const { data: { user: saved }, error: savedError } = await admin.auth.admin.getUserById(user.id)
  if (savedError || !saved) throw savedError ?? new Error('could not read back the account')
  const { data: savedProfile, error: savedProfileError } = await admin
    .from('users').select('display_name, email').eq('id', user.id).single()
  if (savedProfileError) throw savedProfileError

  const result = {
    displayName: savedProfile.display_name ?? '',
    email: saved.email ?? '',
    phone: saved.phone ?? '',
  }
  if (changes.displayName !== undefined && result.displayName !== changes.displayName) throw new Error('name did not save')
  if (changes.email !== undefined && (result.email !== changes.email || savedProfile.email !== changes.email)) throw new Error('email did not save')
  if (changes.phone !== undefined && result.phone !== changes.phone) throw new Error('phone did not save')

  //an email change logs out every other device
  if (changes.email !== undefined) {
    const { error } = await admin.auth.admin.signOut(jwt, 'others')
    if (error) console.error('could not sign out other sessions:', error)
  }

  //tell the account owner
  const what = [
    changes.displayName !== undefined && `name -> ${result.displayName}`,
    changes.email !== undefined && `email -> ${result.email}`,
    changes.phone !== undefined && (result.phone ? `phone number -> +${result.phone}` : 'phone number removed'),
  ].filter(Boolean).join('\n  ')
  const text =
    `Hi ${result.displayName || 'there'},\n\nThe following was changed on your ChorePal account:\n  ${what}\n\n` +
    `If you didn't make this change, reset your password right away and contact the ChorePal team.\n`
  const recipients = new Set([result.email])
  if (changes.email !== undefined && user.email) recipients.add(user.email) //the OLD address must hear about it too
  const sent = await Promise.all([...recipients].map((to) => sendMail(to, 'Your ChorePal account was changed', text)))

  return json({ ...result, changed: Object.keys(changes), notified: sent.every(Boolean) })
})
