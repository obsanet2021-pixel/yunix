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
    const userId = body?.user_id?.toString().trim();
    const email = body?.email?.toString().trim().toLowerCase();
    const telegramChatId = body?.telegram_chat_id?.toString().trim();

    console.log("Incoming OTP payload:", { user_id: userId, email, telegram_chat_id: telegramChatId });

    if (!userId || !email || !telegramChatId) {
      return new Response(
        JSON.stringify({ success: false, error: "INVALID_PAYLOAD" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ success: false, error: "MISSING_ENV" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!telegramBotToken) {
      console.error("Missing TELEGRAM_BOT_TOKEN");
      return new Response(
        JSON.stringify({ success: false, error: "TELEGRAM_CONFIG_ERROR" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .eq('telegram_chat_id', telegramChatId)
      .maybeSingle();

    console.log("Profile validation result:", { profile, error: profileError?.message });

    if (profileError) {
      console.error('Profile validation error:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: "INVALID_PAYLOAD" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile || profile.email?.toString().trim().toLowerCase() !== email) {
      console.error('Payload mismatch: user_id/email/telegram_chat_id does not match profile.');
      return new Response(
        JSON.stringify({ success: false, error: "INVALID_PAYLOAD" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawOtpCode = generateOTP();
    const hashedOtpCode = await hashOTP(rawOtpCode);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from('telegram_otp').insert({
      user_id: userId,
      email,
      telegram_chat_id: telegramChatId,
      otp_code: hashedOtpCode,
      raw_otp_code: rawOtpCode,
      purpose: 'password_reset',
      expires_at: expiresAt,
      used: false,
      created_at: new Date().toISOString()
    });

    if (insertError) {
      console.error('OTP insert error:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: "OTP_STORAGE_FAILED" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: `🔐 Your YUNIX password reset code is: ${rawOtpCode}\n\nThis code expires in 5 minutes. Do not share this code with anyone.`,
      }),
    });

    const telegramBody = await telegramResponse.json().catch((parseError) => {
      console.error('Telegram response parse error:', parseError);
      return null;
    });

    console.log("Telegram delivery result:", { ok: telegramResponse.ok, body: telegramBody });

    if (!telegramResponse.ok || telegramBody?.ok !== true) {
      const telegramError = telegramBody?.description || telegramBody?.error || 'Telegram send failed';
      console.error('Telegram send failed:', telegramError);
      return new Response(
        JSON.stringify({ success: false, error: `TELEGRAM_SEND_FAILED: ${telegramError}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message_id: String(telegramBody.result?.message_id ?? '') }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-telegram-otp:', error);
    return new Response(
      JSON.stringify({ success: false, error: "INTERNAL_ERROR" }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
