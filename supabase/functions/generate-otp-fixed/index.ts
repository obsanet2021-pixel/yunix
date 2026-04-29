import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const generateOTP = (): string => {
  const randomValues = crypto.getRandomValues(new Uint32Array(1));
  return String(100000 + (randomValues[0] % 900000));
};

async function hashOTP(otp: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(otp)
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const email = body?.email?.toString().trim().toLowerCase();

    console.log("Fixed OTP function - Email:", email);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

    if (!supabaseUrl || !supabaseKey || !telegramBotToken) {
      return new Response(
        JSON.stringify({ success: false, error: "MISSING_ENV" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Look up user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, telegram_chat_id')
      .eq('email', email)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { action: 'USER_NOT_FOUND' },
          message: 'If the email exists, a reset code has been sent' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.telegram_chat_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'TELEGRAM_NOT_LINKED',
          message: 'Telegram not linked to this account'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate OTP
    const rawOtpCode = generateOTP();
    const hashedOtpCode = await hashOTP(rawOtpCode);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const linkToken = crypto.randomUUID();

    console.log("Inserting OTP with link_token:", linkToken);

    // Store OTP - WITH link_token (THE FIX!)
    const { error: insertError } = await supabase.from('telegram_otp').insert({
      user_id: profile.id,
      email: profile.email,
      telegram_chat_id: profile.telegram_chat_id.toString(),
      otp_code: hashedOtpCode,
      raw_otp_code: rawOtpCode,
      purpose: 'password_reset',
      expires_at: expiresAt,
      used: false,
      created_at: new Date().toISOString(),
      link_token: linkToken  // ← THE FIX!
    });

    if (insertError) {
      console.error('OTP insert error:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: "OTP_STORAGE_FAILED", details: insertError.message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("OTP stored, sending to Telegram...");

    // Send to Telegram
    const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: profile.telegram_chat_id,
        text: `🔐 Your YUNIX verification code is: ${rawOtpCode}\n\nThis code expires in 5 minutes. Do not share this code with anyone.`,
      }),
    });

    const telegramBody = await telegramResponse.json();
    console.log("Telegram response:", telegramBody);

    if (!telegramResponse.ok || telegramBody?.ok !== true) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "TELEGRAM_SEND_FAILED",
          details: telegramBody?.description || 'Unknown error'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          action: 'OTP_SENT', 
          delivery: 'telegram',
          message_id: String(telegramBody.result?.message_id ?? '')
        },
        message: 'OTP sent to Telegram'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
