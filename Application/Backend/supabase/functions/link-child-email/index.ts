import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Children never see or type their real email - they get a synthetic
// ${username}@chorepal.internal address at signup, purely to satisfy
// Supabase Auth's requirement for one. That address is undeliverable, which
// breaks password-recovery emails. Once a child actually joins a household,
// this swaps their auth email to a "plus-addressed" variant of the
// household's founding parent's real email (parent+username@domain) - a
// unique string most providers (Gmail, Outlook, iCloud, ...) still deliver
// straight to the parent's own inbox, so recovery emails for a child
// actually reach someone. Login is unaffected: find_email_by_username
// always resolves to whatever email is currently on file.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '')

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    //identify the caller from their own JWT - this function only ever acts
    //on the caller's own account, never an arbitrary id from the body
    const { data: { user }, error: userError } = await admin.auth.getUser(jwt)
    if (userError || !user) throw new Error('not authenticated')

    const { data: child, error: childError } = await admin
      .from('users')
      .select('role, family_id, username')
      .eq('id', user.id)
      .single()
    if (childError || !child) throw new Error('user not found')
    if (child.role !== 'child' || !child.family_id) {
      throw new Error('only a child with a household can link their email')
    }

    //family_id is the founding parent's own user id
    const { data: parent, error: parentError } = await admin
      .from('users')
      .select('email')
      .eq('id', child.family_id)
      .single()
    if (parentError || !parent?.email) throw new Error("could not find the household's parent email")

    const [localPart, domain] = parent.email.split('@')
    if (!localPart || !domain) throw new Error('parent email is not in a usable format')
    const newEmail = `${localPart}+${child.username}@${domain}`

    const { error: updateAuthError } = await admin.auth.admin.updateUserById(user.id, {
      email: newEmail,
      email_confirm: true,
    })
    if (updateAuthError) throw updateAuthError

    const { error: updateProfileError } = await admin
      .from('users')
      .update({ email: newEmail })
      .eq('id', user.id)
    if (updateProfileError) throw updateProfileError

    return new Response(
      JSON.stringify({ email: newEmail }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('link-child-email error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
