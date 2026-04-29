/// <reference types="https://deno.land/x/types/deno.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Check if user exists (for determining flow type, but OTP is always sent)
    let userId: string | undefined;
    let telegramChatId: string | null = null;
    let userExists = false;

    try {
      // Try admin API first (newer versions)
      const { data: authData, error: authError } = await supabase.auth.admin.getUserByEmail(normalizedEmail);

      console.log(`Auth lookup for ${normalizedEmail}:`, {
        found: !!authData?.user,
        error: authError?.message
      });

      if (authData?.user) {
        userId = authData.user.id;
        userExists = true;
      }
    } catch (methodError) {
      console.log('getUserByEmail not available, falling back to profiles lookup');
    }

    // Fallback: check profiles table directly
    if (!userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, telegram_chat_id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (profile) {
        userId = profile.id;
        telegramChatId = profile.telegram_chat_id || null;
        userExists = true;
      }
    }

    // If found in auth but not in profiles fallback, check profiles for Telegram
    if (userId && !telegramChatId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('telegram_chat_id')
        .eq('id', userId)
        .maybeSingle();

      telegramChatId = profile?.telegram_chat_id || null;

      console.log(`Profile lookup:`, {
        hasProfile: !!profile,
        hasTelegram: !!telegramChatId
      });
    }

    // Generate challenge ID for OTP verification
    const challengeId = crypto.randomUUID();
    // Generate a placeholder userId for new users (will create actual user on verification)
    const placeholderUserId = userId || `pending_${crypto.randomUUID()}`;

    // ALWAYS try to send OTP via Telegram (passwordless flow)
    // Note: For new users, we'll store the challenge and create user on verification
    // Try to send via Telegram OTP system first (for ALL users, existing or new)
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const telegramResponse = await fetch(`${supabaseUrl}/functions/v1/generate-telegram-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey || ''
      },
      body: JSON.stringify({
        email: normalizedEmail,
        purpose: 'password_reset'
      })
    });

    const otpData = await telegramResponse.json();

    console.log('generate-telegram-otp response:', {
      status: telegramResponse.status,
      ok: telegramResponse.ok,
      success: otpData.success,
      action: otpData.data?.action,
      error: otpData.error,
      fullResponse: otpData
    });

    // Check Telegram response
    if (telegramResponse.ok && otpData.success) {
      if (otpData.data.action === 'OTP_SENT') {
        // OTP was sent via Telegram - now store the challenge for verification
        // We need to get the OTP from telegram_otp table to hash it for auth_challenges
        const { data: telegramOtp } = await supabase
          .from('telegram_otp')
          .select('raw_otp_code')
          .eq('email', normalizedEmail)
          .eq('purpose', 'password_reset')
          .eq('used', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (telegramOtp && telegramOtp.raw_otp_code) {
          // Hash the OTP for storage in auth_challenges
          const encoder = new TextEncoder();
          const data = encoder.encode(telegramOtp.raw_otp_code);
          const hash = await crypto.subtle.digest('SHA-256', data);
          const hashedOTP = btoa(String.fromCharCode(...new Uint8Array(hash)));

          // Store challenge in auth_challenges table
          // For new users, we store with placeholder ID and will update on verification
          const { error: challengeError } = await supabase
            .from('auth_challenges')
            .insert({
              id: challengeId,
              user_id: placeholderUserId,
              hashed_code: hashedOTP,
              attempts: 0,
              expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
              locked_until: null
            });

          if (challengeError) {
            console.error('Failed to store challenge:', challengeError);
          }

          // Return challengeId so frontend can verify OTP
          return new Response(
            JSON.stringify({
              success: true,
              action: 'OTP_SENT',
              challengeId: challengeId,
              message: 'Verification code sent to your Telegram',
              delivery: 'telegram',
              userExists: userExists // Let frontend know if this is existing or new user
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else if (otpData.data.action === 'TELEGRAM_LINK_REQUIRED') {
        // For new users without Telegram, fallback to email/console OTP
        console.log(`User ${normalizedEmail} needs Telegram link, falling back to console OTP`);
      }
    }

    // Fallback: Generate OTP locally and log it (works for ALL users)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`OTP for ${normalizedEmail} (${userExists ? 'existing' : 'new'} user): ${otpCode}`);
    console.log(`Challenge ID: ${challengeId}`);

    // Hash the OTP for storage
    const encoder = new TextEncoder();
    const data = encoder.encode(otpCode);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashedOTP = btoa(String.fromCharCode(...new Uint8Array(hash)));

    // Store challenge in auth_challenges table
    // For new users, we store with placeholder ID and will create user on verification
    const { error: fallbackChallengeError } = await supabase
      .from('auth_challenges')
      .insert({
        id: challengeId,
        user_id: placeholderUserId,
        hashed_code: hashedOTP,
        attempts: 0,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        locked_until: null
      });

    if (fallbackChallengeError) {
      console.error('Failed to store fallback challenge:', fallbackChallengeError);
    }

    // Return challengeId for ALL users (passwordless flow)
    return new Response(
      JSON.stringify({
        success: true,
        action: 'OTP_SENT',
        challengeId: challengeId,
        message: `Verification code sent. ${userExists ? 'Welcome back!' : 'New account will be created.'}`,
        delivery: 'console',
        userExists: userExists
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in forgot-password:', error);
    const message = error instanceof Error ? error.message : 'Something went wrong';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});