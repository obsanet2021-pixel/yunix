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
    const email = body?.email?.toString().trim().toLowerCase() || 'obsanet2021@gmail.com';

    console.log(`Testing OTP flow for: ${email}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

    if (!supabaseUrl || !supabaseKey || !telegramBotToken) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "MISSING_ENV",
          missing: {
            supabaseUrl: !supabaseUrl,
            supabaseKey: !supabaseKey,
            telegramBotToken: !telegramBotToken
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Look up user profile
    console.log('Step 1: Looking up profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, telegram_chat_id')
      .eq('email', email)
      .maybeSingle();

    if (profileError) {
      console.error('Profile lookup error:', profileError);
      return new Response(
        JSON.stringify({ success: false, step: 'profile_lookup', error: profileError.message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile) {
      return new Response(
        JSON.stringify({ success: false, step: 'profile_lookup', error: 'User not found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Profile found:', { id: profile.id, telegram_chat_id: profile.telegram_chat_id });

    if (!profile.telegram_chat_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          step: 'telegram_check', 
          error: 'Telegram not linked',
          profile: { id: profile.id, email: profile.email }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Generate OTP
    console.log('Step 2: Generating OTP...');
    const randomValues = crypto.getRandomValues(new Uint32Array(1));
    const rawOtpCode = String(100000 + (randomValues[0] % 900000));
    
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(rawOtpCode)
    );
    const hashedOtpCode = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    
    console.log(`OTP generated: ${rawOtpCode} (hashed: ${hashedOtpCode.substring(0, 16)}...)`);

    // Step 3: Store OTP in database
    console.log('Step 3: Storing OTP in database...');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    
    const { error: insertError } = await supabase.from('telegram_otp').insert({
      user_id: profile.id,
      email: profile.email,
      telegram_chat_id: profile.telegram_chat_id.toString(),
      otp_code: hashedOtpCode,
      raw_otp_code: rawOtpCode,
      purpose: 'test',
      expires_at: expiresAt,
      used: false,
      created_at: new Date().toISOString()
    });

    if (insertError) {
      console.error('OTP storage error:', insertError);
      return new Response(
        JSON.stringify({ success: false, step: 'otp_storage', error: insertError.message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('OTP stored successfully');

    // Step 4: Send to Telegram
    console.log('Step 4: Sending to Telegram...');
    const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: profile.telegram_chat_id,
        text: `🔐 TEST OTP: Your YUNIX verification code is: ${rawOtpCode}\n\nThis is a test message. Code expires in 5 minutes.`,
      }),
    });

    console.log('Telegram response status:', telegramResponse.status);

    const telegramBody = await telegramResponse.json().catch((parseError) => {
      console.error('Telegram response parse error:', parseError);
      return null;
    });

    console.log('Telegram response body:', telegramBody);

    if (!telegramResponse.ok || telegramBody?.ok !== true) {
      const telegramError = telegramBody?.description || telegramBody?.error || 'Unknown error';
      return new Response(
        JSON.stringify({ 
          success: false, 
          step: 'telegram_send', 
          error: telegramError,
          http_status: telegramResponse.status,
          telegram_response: telegramBody
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Success!
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully!',
        otp_code: rawOtpCode,
        chat_id: profile.telegram_chat_id,
        message_id: telegramBody.result?.message_id,
        profile: {
          id: profile.id,
          email: profile.email
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Test error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        step: 'unexpected_error', 
        error: error instanceof Error ? error.message : String(error)
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
