import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const email = body?.email?.toString().trim().toLowerCase();

    console.log("Incoming email:", email);

    if (!email) {
      return new Response(
        JSON.stringify({ status: "ERROR", message: "Email is required" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey || !anonKey) {
      console.error("Missing environment variables");
      return new Response(
        JSON.stringify({ status: "ERROR", message: "Server configuration error" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminUrl = `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`;
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
        JSON.stringify({ status: "ERROR", message: "User lookup failed" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("User lookup result:", { ok: adminResponse.ok, users });

    if (!adminResponse.ok || !Array.isArray(users) || users.length === 0) {
      return new Response(
        JSON.stringify({ status: "USER_NOT_FOUND" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = users[0];
    console.log("User found:", { id: user.id, email: user.email });

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('telegram_chat_id')
      .eq('id', user.id)
      .maybeSingle();

    console.log("Profile lookup result:", { profile, error: profileError?.message });

    if (profileError) {
      console.error('Profile lookup error:', profileError);
      return new Response(
        JSON.stringify({ status: "ERROR", message: "Profile lookup failed" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile?.telegram_chat_id) {
      return new Response(
        JSON.stringify({ status: "TELEGRAM_NOT_LINKED" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Telegram linked:", { telegram_chat_id: profile.telegram_chat_id });

    const otpResponse = await fetch(`${supabaseUrl}/functions/v1/generate-telegram-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey
      },
      body: JSON.stringify({
        user_id: user.id,
        email: email,
        telegram_chat_id: profile.telegram_chat_id
      })
    });

    const otpText = await otpResponse.text();
    let otpData;
    try {
      otpData = JSON.parse(otpText);
    } catch (parseError) {
      console.error('Invalid OTP response:', otpText, parseError);
      otpData = null;
    }

    console.log("OTP generation result:", { status: otpResponse.status, body: otpData });

    if (!otpResponse.ok || otpData?.success !== true) {
      const errorMessage = otpData?.error || 'OTP generation failed';
      return new Response(
        JSON.stringify({ status: "ERROR", message: errorMessage }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ status: "OTP_SENT" }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in forgot-password:', error);
    return new Response(
      JSON.stringify({ status: "ERROR", message: error?.message || 'Something went wrong' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
