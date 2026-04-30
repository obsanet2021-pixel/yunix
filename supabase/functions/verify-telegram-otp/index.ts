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

    // Find user by email from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('Profile lookup failed:', profileError?.message);
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

    const user = { id: profile.id, email: profile.email };

    // Check OTP in telegram_otp table
    const { data: otpRecord, error: otpError } = await supabase
      .from('telegram_otp')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('user_id', user.id)
      .eq('used', false)
      .gt('expires_at', currentTime)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) {
      console.error('OTP lookup error:', otpError);
      return new Response(
        JSON.stringify({
          success: false,
          data: null,
          error: { code: "OTP_LOOKUP_FAILED", message: "Failed to verify OTP" },
          meta: {},
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!otpRecord) {
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

    // Verify the hashed OTP
    const otpHashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(trimmedOtpCode)
    );
    const hashedInput = Array.from(new Uint8Array(otpHashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (hashedInput !== otpRecord.otp_code) {
      console.log(`❌ OTP hash mismatch for ${normalizedEmail}`);
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
        let errorMessage = "Failed to update password";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorText;
        } catch {
          errorMessage = errorText;
        }
        return new Response(
          JSON.stringify({
            success: false,
            data: null,
            error: { code: "PASSWORD_UPDATE_FAILED", message: errorMessage },
            meta: {},
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`✅ Password updated for user: ${user.id}`);

      // Mark OTP as used only after successful password reset
      const { error: markUsedError } = await supabase
        .from('telegram_otp')
        .update({ used: true })
        .eq('id', otpRecord.id);

      if (markUsedError) {
        console.warn('Failed to mark OTP as used:', markUsedError);
      }
    }

    // Return success - OTP verified
    console.log(`✅ OTP verified successfully for ${normalizedEmail}`);
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user_id: user.id,
          email: user.email,
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
