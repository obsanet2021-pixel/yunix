import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_token } = await req.json();

    if (!session_token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "MISSING_TOKEN", message: "Session token required" },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Hash incoming token (because DB stores hash only)
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(session_token)
    );

    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    // Check session
    const { data: session, error } = await supabase
      .from("sessions")
      .select("id, email, user_id, expires_at, revoked")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error || !session) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "INVALID_SESSION", message: "Session not found" },
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "SESSION_EXPIRED", message: "Session expired" },
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check revoked
    if (session.revoked) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "SESSION_REVOKED", message: "Session revoked" },
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SUCCESS
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user_id: session.user_id,
          email: session.email,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
