import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otpCode, purpose = 'verification' } = await req.json();

    if (!email || !otpCode) {
      return new Response(
        JSON.stringify({ error: 'Email and OTP code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the OTP record
    const { data: otpRecord, error: findError } = await supabase
      .from('telegram_otp')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('otp_code', otpCode)
      .eq('purpose', purpose)
      .eq('used', false)
      .eq('verified', true) // Must be verified via Telegram first
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (findError || !otpRecord) {
      console.error('OTP not found or invalid:', findError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired OTP code',
          verified: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark OTP as used
    const { error: updateError } = await supabase
      .from('telegram_otp')
      .update({ used: true })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error('Error marking OTP as used:', updateError);
    }

    console.log(`OTP verified for ${email}, purpose: ${purpose}`);

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        userId: otpRecord.user_id,
        email: otpRecord.email,
        purpose: otpRecord.purpose,
        telegramChatId: otpRecord.telegram_chat_id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-telegram-otp:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', verified: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
