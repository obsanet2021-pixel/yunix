import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a random 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate a secure random token
const generateLinkToken = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, purpose = 'verification' } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate purpose
    const validPurposes = ['verification', 'signin', 'password_reset', 'new_user_link'];
    if (!validPurposes.includes(purpose)) {
      return new Response(
        JSON.stringify({ error: 'Invalid purpose' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limiting: Check how many OTPs were generated for this email in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentOtps, error: countError } = await supabase
      .from('telegram_otp')
      .select('id')
      .eq('email', email.toLowerCase())
      .gte('created_at', oneHourAgo);

    if (countError) {
      console.error('Error checking rate limit:', countError);
    }

    if (recentOtps && recentOtps.length >= 5) {
      return new Response(
        JSON.stringify({ error: 'Too many OTP requests. Please wait before trying again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user exists and has Telegram linked
    const { data: authUser } = await supabase.auth.admin.listUsers();
    const existingUser = authUser?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    // Check profiles table for Telegram link
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, telegram_chat_id')
      .eq('email', email.toLowerCase())
      .single();

    const alreadyLinked = !!(profile?.telegram_chat_id);

    // Generate OTP and link token
    const otpCode = generateOTP();
    const linkToken = `otp_${generateLinkToken()}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Insert OTP record
    const { error: insertError } = await supabase
      .from('telegram_otp')
      .insert({
        email: email.toLowerCase(),
        user_id: existingUser?.id || profile?.id || null,
        otp_code: otpCode,
        link_token: linkToken,
        purpose,
        expires_at: expiresAt,
        verified: alreadyLinked, // If already linked, mark as verified
        telegram_chat_id: profile?.telegram_chat_id || null,
      });

    if (insertError) {
      console.error('Error inserting OTP:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If user already has Telegram linked, send OTP directly
    let otpSent = false;
    if (alreadyLinked && profile?.telegram_chat_id && telegramBotToken) {
      try {
        const message = `🔐 *YUNIX SECURITY CODE*\n\nYour verification code is: \`${otpCode}\`\n\nThis code expires in 5 minutes.\nDo not share this code with anyone.`;
        
        const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: profile.telegram_chat_id,
            text: message,
            parse_mode: 'Markdown',
          }),
        });

        if (telegramResponse.ok) {
          otpSent = true;
          console.log(`OTP sent directly to linked Telegram for ${email}`);
        } else {
          console.error('Failed to send Telegram message:', await telegramResponse.text());
        }
      } catch (telegramError) {
        console.error('Error sending Telegram message:', telegramError);
      }
    }

    // Generate Telegram deep link (used if not already linked)
    const telegramLink = `https://t.me/YunixOfficialBot?start=${linkToken}`;

    console.log(`Generated OTP for ${email}: purpose=${purpose}, alreadyLinked=${alreadyLinked}, otpSent=${otpSent}`);

    return new Response(
      JSON.stringify({
        success: true,
        telegramLink,
        expiresAt,
        linkToken,
        alreadyLinked,
        otpSent,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-telegram-otp:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
