import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0'
import { HttpError, json, readJson, serve } from '../_shared/http.ts'
import { sendMail } from '../_shared/mail.ts'

//"forgot password" for a child. body: { username }
//children sign in as <username>@chorepal.internal, an address nobody reads, so
//the reset code goes to the email of the parent who runs their household -
//looked up here, on the server, at the moment it's needed (it follows the
//parent if they change their email). the caller never learns that address.
//
//the answer is the same whether or not the username exists, so this can't be
//used to find out which usernames are real. the child finishes with
//verifyOtp({ email: '<username>@chorepal.internal', token, type: 'recovery' }).

const USERNAME_RE = /^[a-z0-9._-]{2,30}$/
const RESEND_AFTER_MS = 60_000 //one code per child per minute, so a parent's inbox can't be flooded

serve('child-reset-code', async (req) => {
  const body = await readJson(req)
  if (typeof body.username !== 'string') throw new HttpError(400, 'username is required')
  const username = body.username.trim().toLowerCase().replace(/\s/g, '')
  const done = json({ sent: true })
  if (!USERNAME_RE.test(username)) return done

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  const loginEmail = `${username}@chorepal.internal`

  const { data: child, error: childError } = await admin
    .from('users').select('id, role, family_id, display_name').eq('email', loginEmail).maybeSingle()
  if (childError) throw childError
  if (!child || child.role !== 'child' || !child.family_id) return done //no household = no grown-up to send it to

  //the household is rooted at its parent's id - use the parent's current login email
  const { data: { user: parent }, error: parentError } = await admin.auth.admin.getUserById(child.family_id)
  if (parentError || !parent?.email) {
    console.error('child-reset-code: no parent email for household', child.family_id, parentError)
    return done
  }

  const { data: { user: childAuth }, error: childAuthError } = await admin.auth.admin.getUserById(child.id)
  if (childAuthError || !childAuth) throw childAuthError ?? new Error('child auth user missing')
  const lastSent = childAuth.recovery_sent_at ? Date.parse(childAuth.recovery_sent_at) : 0
  if (Date.now() - lastSent < RESEND_AFTER_MS) return done

  //makes a one-time recovery code without Supabase emailing the internal address
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'recovery', email: loginEmail })
  if (linkError) throw linkError
  const code = link.properties?.email_otp
  if (!code) throw new Error('no recovery code returned')

  const name = child.display_name || username
  const sent = await sendMail(
    parent.email,
    `ChorePal password reset code for ${name}`,
    `Hi,\n\n${name} (username: ${username}) asked to reset their ChorePal password.\n\n` +
      `Their reset code is: ${code}\n\n` +
      `Enter it on their "Forgot password" screen with a new password. The code works once and expires in 1 hour.\n\n` +
      `If ${name} didn't ask for this, you can ignore this email - their password stays the same.\n`,
  )
  if (!sent) console.error(`child-reset-code: could not email the code for ${username}`)

  return done
})
