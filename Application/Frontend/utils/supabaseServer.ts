import { createClient } from "@supabase/supabase-js";

// Used inside app/api/**+api.ts route handlers only. Forwards the caller's
// own auth token instead of using a service-role key, so RLS still enforces
// row access the same way it does for direct client queries today.
export function createRequestClient(request: Request) {
  const authHeader = request.headers.get("Authorization") ?? "";
  return createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_KEY!,
    {
      global: { headers: { Authorization: authHeader } },
    },
  );
}
