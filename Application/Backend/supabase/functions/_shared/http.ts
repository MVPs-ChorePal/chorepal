//shared request/response helpers for the edge functions

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

//an error that is safe to show the caller - carries its HTTP status
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

//parses the request body, turning bad JSON into a clean 400
// deno-lint-ignore no-explicit-any
export async function readJson(req: Request): Promise<Record<string, any>> {
  try {
    const body = await req.json()
    if (body && typeof body === 'object' && !Array.isArray(body)) return body
  } catch { /* fall through */ }
  throw new HttpError(400, 'request body must be a JSON object')
}

//HttpErrors are expected (bad input, no access...) and go back to the caller as-is
export function errorResponse(fn: string, error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status)
  console.error(`${fn} unexpected error:`, error)
  return json({ error: 'something went wrong, please try again' }, 500)
}
