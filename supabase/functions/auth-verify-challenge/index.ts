/// <reference types="https://deno.land/x/types/deno.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { challengeId, code } = await req.json();

    if (!challengeId || !code) {
      return new Response(
        JSON.stringify({ error: 'Challenge ID and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get challenge
    const { data: challenge } = await supabase
      .from('auth_challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (!challenge) {
      return new Response(
        JSON.stringify({ error: 'Invalid challenge' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (new Date(challenge.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Challenge expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check lockout
    if (challenge.locked_until && new Date(challenge.locked_until) > new Date()) {
      const waitMinutes = Math.ceil((new Date(challenge.locked_until).getTime() - Date.now()) / 60000);
      return new Response(
        JSON.stringify({ error: `Too many attempts. Try again in ${waitMinutes} minutes` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash input code
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashedInput = btoa(String.fromCharCode(...new Uint8Array(hash)));

    // Secure comparison
    const isValid = secureCompare(hashedInput, challenge.code_hash);

    if (!isValid) {
      // Update attempts only on failed verification
      const newAttemptCount = (challenge.attempt_count || 0) + 1;
      await supabase
        .from('auth_challenges')
        .update({
          attempt_count: newAttemptCount,
          locked_until: newAttemptCount >= 5
            ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
            : null
        })
        .eq('id', challengeId);

      return new Response(
        JSON.stringify({ error: 'Invalid verification code' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user email
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', challenge.user_id)
      .single();

    if (profileError || !userProfile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate recovery token
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: userProfile.email
    });

    if (resetError) {
      console.error('Error generating recovery link:', resetError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate recovery token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete used challenge only after successful token generation
    await supabase.from('auth_challenges').delete().eq('id', challengeId);

    return new Response(
      JSON.stringify({
        success: true,
        recoveryToken: resetData.properties?.access_token,
        message: 'Verification successful'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in auth-verify-challenge:', error);
    const message = error instanceof Error ? error.message : 'Something went wrong';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
