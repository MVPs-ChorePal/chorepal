//shared request/response helpers for the edge functions

//browsers may only call the functions from these origins
const DEFAULT_ORIGINS = ['http://localhost:8081', 'http://127.0.0.1:8081', 'http://localhost:19006']

function allowedOrigins(): string[] {
  const configured = Deno.env.get('ALLOWED_ORIGINS')
  if (!configured) return DEFAULT_ORIGINS
  return configured.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean)
}

function corsHeadersFor(req: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
  const origin = req.headers.get('Origin')
  if (origin && allowedOrigins().includes(origin)) headers['Access-Control-Allow-Origin'] = origin
  return headers
}

//an error that is safe to show the caller - carries its HTTP status
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
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

//wraps a function's handler: answers CORS preflights, turns thrown errors into
//responses via errorResponse, and adds the CORS headers to every response
export function serve(fn: string, handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    const cors = corsHeadersFor(req)
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

    let res: Response
    try {
      res = await handler(req)
    } catch (error) {
      res = errorResponse(fn, error)
    }
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
    return res
  })
}
