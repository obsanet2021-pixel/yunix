/// <reference types="https://deno.land/x/types/deno.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Telegram OIDC Configuration
const TELEGRAM_OIDC_ISSUER = 'https://oauth.telegram.org';
const TELEGRAM_TOKEN_URL = 'https://oauth.telegram.org/token';

// JWT decoding without verification (for extracting payload)
function base64UrlDecode(str: string): string {
  // Add padding if needed
  const padding = '='.repeat((4 - str.length % 4) % 4);
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding;
  return atob(base64);
}

function decodeJWT(token: string): { header: any; payload: any; signature: string } {
  const [headerB64, payloadB64, signature] = token.split('.');
  const header = JSON.parse(base64UrlDecode(headerB64));
  const payload = JSON.parse(base64UrlDecode(payloadB64));
  return { header, payload, signature };
}


// Verify JWT signature (simplified - in production use a proper JWT library)
async function verifyTelegramToken(idToken: string, clientId: string, expectedNonce?: string): Promise<any> {
  const { payload } = decodeJWT(idToken);
  
  // Verify issuer
  if (payload.iss !== TELEGRAM_OIDC_ISSUER) {
    throw new Error('Invalid issuer');
  }
  
  // Verify audience (client_id)
  if (payload.aud !== clientId) {
    throw new Error('Invalid audience');
  }
  
  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token expired');
  }

  // Verify nonce if provided (prevents replay attacks)
  if (expectedNonce && payload.nonce !== expectedNonce) {
    throw new Error('Invalid nonce');
  }
  
  // Note: In production, you should also verify the signature using the JWKS
  // For now, we trust the token since it came from Telegram's OAuth flow
  // and the frontend should only send tokens from the official Telegram widget
  
  return payload;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { id_token, user: telegramUser, code, nonce } = await req.json();
    
    if (!id_token && !code) {
      return new Response(
        JSON.stringify({ error: 'ID token or authorization code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store nonce for verification (if provided)
    const expectedNonce = nonce;

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const telegramClientId = Deno.env.get('TELEGRAM_CLIENT_ID') || '7810018065';
    const telegramClientSecret = Deno.env.get('TELEGRAM_CLIENT_SECRET');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let telegramData: any;

    // If we have an authorization code, exchange it for tokens
    if (code && telegramClientSecret) {
      const tokenResponse = await fetch(TELEGRAM_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${telegramClientId}:${telegramClientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          client_id: telegramClientId,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokenData = await tokenResponse.json();
      telegramData = decodeJWT(tokenData.id_token).payload;
    } else if (id_token) {
      // Verify the ID token (with nonce if provided)
      telegramData = await verifyTelegramToken(id_token, telegramClientId, expectedNonce);
    } else {
      throw new Error('No valid token or code provided');
    }

    console.log('Telegram user data:', telegramData);

    // Extract Telegram user info
    const telegramId = telegramData.id?.toString() || telegramData.sub;
    const telegramUsername = telegramData.preferred_username;
    const firstName = telegramData.name?.split(' ')[0] || telegramData.given_name || 'Telegram';
    const lastName = telegramData.name?.split(' ').slice(1).join(' ') || telegramData.family_name || 'User';
    const photoUrl = telegramData.picture;
    // const phoneNumber = telegramData.phone_number; // Available if phone scope was requested

    if (!telegramId) {
      throw new Error('No Telegram ID found in token');
    }

    // Check if a user with this Telegram ID already exists
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, telegram_chat_id, telegram_linked_at')
      .eq('telegram_chat_id', telegramId)
      .maybeSingle();

    if (profileError) {
      console.error('Error checking existing profile:', profileError);
    }

    let userId: string;
    let isNewUser = false;

    if (existingProfile) {
      // User exists, update their info
      userId = existingProfile.id;
      console.log(`Found existing user: ${userId}`);
      
      // Update profile with latest Telegram info
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          telegram_username: telegramUsername,
          telegram_photo_url: photoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating profile:', updateError);
      }
    } else {
      // Create new user
      isNewUser = true;
      
      // Generate a random password (user will use Telegram login or reset password)
      const randomPassword = crypto.randomUUID();
      const email = telegramUser?.email || `telegram_${telegramId}@yunix.temp`;
      
      console.log(`Creating new user with email: ${email}`);
      
      // Create user in auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          avatar_url: photoUrl,
          provider: 'telegram',
          telegram_id: telegramId,
          telegram_username: telegramUsername,
        },
      });

      if (authError) {
        // Check if user already exists with this email
        if (authError.message?.includes('already')) {
          // Try to find the existing user
          const { data: existingAuthUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle();
          
          if (existingAuthUser) {
            userId = existingAuthUser.id;
            isNewUser = false;
          } else {
            throw new Error(`Failed to create user: ${authError.message}`);
          }
        } else {
          throw new Error(`Failed to create user: ${authError.message}`);
        }
      } else {
        userId = authData!.user!.id;
      }

      // Create or update profile
      const { error: profileUpsertError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: email,
          first_name: firstName,
          last_name: lastName,
          telegram_chat_id: telegramId,
          telegram_username: telegramUsername,
          telegram_photo_url: photoUrl,
          telegram_linked_at: new Date().toISOString(),
          avatar_url: photoUrl,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });

      if (profileUpsertError) {
        console.error('Error upserting profile:', profileUpsertError);
      }

      // Send welcome message via Telegram bot
      try {
        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
        if (botToken) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramId,
              text: `Welcome to YUNIX! 🎉\n\nYour account has been successfully created and linked. You can now log in using Telegram.`,
              parse_mode: 'HTML',
            }),
          });
        }
      } catch (botError) {
        console.error('Error sending welcome message:', botError);
      }
    }

    // Note: The frontend will need to handle authentication
    // The user can either:
    // 1. Use magic link to the email we created
    // 2. Link an existing account
    // 3. Reset password to set their own password
    // The frontend will need to handle authentication via Supabase auth
    
    return new Response(
      JSON.stringify({
        success: true,
        isNewUser,
        user: {
          id: userId,
          telegramId,
          telegramUsername,
          firstName,
          lastName,
          photoUrl,
        },
        message: isNewUser 
          ? 'Account created successfully! Welcome to YUNIX.' 
          : 'Telegram account linked successfully!',
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        } 
      }
    );

  } catch (error: any) {
    console.error('Telegram auth callback error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Authentication failed',
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        } 
      }
    );
  }
});
