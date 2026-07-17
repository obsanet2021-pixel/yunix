import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Auth model
 * ----------
 * Yunix uses Supabase RLS keyed to auth.uid(). This MCP server supports two modes:
 *
 * 1. PERSONAL MODE (default, simplest to stand up):
 *    Set SUPABASE_SERVICE_ROLE_KEY + YUNIX_USER_ID in the environment.
 *    The service role key bypasses RLS, and every query is manually filtered
 *    by user_id = YUNIX_USER_ID so the server only ever touches one account's data.
 *    Good fit for "connect my own Yunix account to my own Claude" — the exact
 *    use case of a custom connector, same as pointing Claude at a personal Notion.
 *
 * 2. MULTI-USER MODE (future, if you open this connector to other Yunix users):
 *    Swap this for per-request OAuth: authenticate the caller against Supabase Auth,
 *    mint a user-scoped access token, and construct the client with that token so
 *    RLS enforces access naturally. The MCP Streamable HTTP transport supports
 *    passing an authorization_token per request — see the SDK docs for wiring
 *    that into `getSupabaseClientForRequest(token)`.
 */

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. " +
        "Set these in your deployment environment (never commit them)."
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  return cachedClient;
}

/** The Yunix account this server is scoped to in PERSONAL MODE. */
export function getScopedUserId(): string {
  const userId = process.env.YUNIX_USER_ID;
  if (!userId) {
    throw new Error(
      "Missing YUNIX_USER_ID environment variable. " +
        "Find your user id in Supabase: select id from auth.users where email = 'you@example.com'."
    );
  }
  return userId;
}

/** Wraps a Supabase query, turning PostgREST errors into actionable MCP-tool error text. */
export async function runQuery<T>(
  label: string,
  fn: () => PromiseLike<{ data: T | null; error: { message: string; code?: string } | null }>
): Promise<T> {
  const { data, error } = await fn();
  if (error) {
    throw new Error(
      `Yunix query failed (${label}): ${error.message}` +
        (error.code ? ` [code ${error.code}]` : "") +
        ". Check that SUPABASE_SERVICE_ROLE_KEY has access and the table/column names match your migrations."
    );
  }
  if (data === null) {
    throw new Error(`Yunix query (${label}) returned no data.`);
  }
  return data;
}
