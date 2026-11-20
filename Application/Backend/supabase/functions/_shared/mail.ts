import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

//sends a plain-text email over SMTP. configured with these secrets:
//SMTP_HOST, SMTP_PORT (465 = TLS, the default), SMTP_USER, SMTP_PASS, SMTP_FROM
//SMTP_INSECURE=true only for the local mail catcher (no TLS, no auth)
export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  const hostname = Deno.env.get('SMTP_HOST')
  const from = Deno.env.get('SMTP_FROM')
  if (!hostname || !from) {
    console.warn(`email not sent (SMTP_HOST/SMTP_FROM not set): "${subject}"`)
    return false
  }
  const port = Number(Deno.env.get('SMTP_PORT') ?? 465)
  const insecure = Deno.env.get('SMTP_INSECURE') === 'true'
  const username = Deno.env.get('SMTP_USER')
  const password = Deno.env.get('SMTP_PASS')

  const client = new SMTPClient({
    connection: {
      hostname,
      port,
      tls: !insecure && port === 465,
      ...(username && password ? { auth: { username, password } } : {}),
    },
    ...(insecure ? { debug: { allowUnsecure: true, noStartTLS: true } } : {}),
  })
  try {
    await client.send({ from, to, subject, content: text })
    return true
  } catch (error) {
    console.error(`email to ${to} failed:`, error)
    return false
  } finally {
    try { await client.close() } catch { /* already closed */ }
  }
}
