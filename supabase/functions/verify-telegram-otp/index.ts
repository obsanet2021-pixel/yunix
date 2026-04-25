import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otpCode, newPassword } = await req.json();

    if (!email || !otpCode) {
      return new Response(
        JSON.stringify({
          success: false,
          data: null,
          error: { code: "MISSING_FIELDS", message: "Email and OTP code are required" },
          meta: {},
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({
          success: false,
          data: null,
          error: { code: "MISSING_ENV", message: "Server configuration error" },
          meta: {},
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const trimmedOtpCode = String(otpCode).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const currentTime = new Date().toISOString();

    console.log(`🔐 Verifying OTP for ${normalizedEmail}`);
    console.log(`Input code: ${trimmedOtpCode}`);

    // Find user by email
    const adminUrl = `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(normalizedEmail)}`;
    const adminResponse = await fetch(adminUrl, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      }
    });

    const adminText = await adminResponse.text();
    let users;
    try {
      users = JSON.parse(adminText);
    } catch (parseError) {
      console.error('Failed to parse admin users response:', adminText, parseError);
      return new Response(
        JSON.stringify({
          success: false,
          data: null,
          error: { code: "USER_LOOKUP_FAILED", message: "User lookup failed" },
          meta: {},
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!adminResponse.ok || !Array.isArray(users) || users.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          data: null,
          error: { code: "USER_NOT_FOUND", message: "User not found" },
          meta: {},
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = users[0];

    // Check OTP in user app_metadata
    const metadata = user.app_metadata || {};
    const storedOtp = metadata.reset_otp;
    const expiresAt = metadata.reset_otp_expires_at;

    if (!storedOtp || !expiresAt || storedOtp !== trimmedOtpCode || new Date(expiresAt) < currentTime) {
      console.log(`❌ No matching OTP found for ${normalizedEmail}`);
      return new Response(
        JSON.stringify({
          success: false,
          data: null,
          error: { code: "OTP_INVALID", message: "Invalid or expired verification code." },
          meta: {},
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Found matching OTP for user: ${user.id}`);

    // Reset password if provided
    if (newPassword) {
      console.log(`🔄 Resetting password for user: ${user.id}`);
      const passwordUpdateUrl = `${supabaseUrl}/auth/v1/admin/users/${user.id}`;
      const passwordUpdateResponse = await fetch(passwordUpdateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: newPassword
        })
      });

      if (!passwordUpdateResponse.ok) {
        const errorText = await passwordUpdateResponse.text();
        console.error('Failed to update password:', errorText);
        return new Response(
          JSON.stringify({
            success: false,
            data: null,
            error: { code: "PASSWORD_UPDATE_FAILED", message: "Failed to update password" },
            meta: {},
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`✅ Password updated for user: ${user.id}`);
    }

    // Clear OTP from metadata
    const clearUrl = `${supabaseUrl}/auth/v1/admin/users/${user.id}`;
    const clearResponse = await fetch(clearUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_metadata: {
          reset_otp: null,
          reset_otp_expires_at: null
        }
      })
    });

    if (!clearResponse.ok) {
      console.warn(`⚠️ Failed to clear OTP from metadata`);
      return new Response(
        JSON.stringify({
          success: false,
          data: null,
          error: {
            code: "OTP_UPDATE_FAILED",
            message: "Failed to update OTP status.",
          },
          meta: {},
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ OTP cleared from metadata`);

    // Create session
    const sessionToken = crypto.randomUUID() + crypto.randomUUID();
    
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(sessionToken),
    );

    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("x-real-ip")?.trim() ||
               null;

    const userAgent = req.headers.get("user-agent") || null;

    const { error: sessionError } = await supabase.from("sessions").insert({
      email: normalizedEmail,
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ip_address: ip,
      user_agent: userAgent,
      revoked: false,
    });

    if (sessionError) {
      console.error("Error creating session:", sessionError);
      return new Response(
        JSON.stringify({
          success: false,
          data: null,
          error: {
            code: "SESSION_CREATE_FAILED",
            message: "Could not create session",
          },
          meta: {},
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Session created for ${normalizedEmail}`);

    // Return session token
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          session_token: sessionToken,
          user_id: user.id,
        },
        error: null,
        meta: {},
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in verify-telegram-otp:", error);
    return new Response(
      JSON.stringify({
        success: false,
        data: null,
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
        meta: {},
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
