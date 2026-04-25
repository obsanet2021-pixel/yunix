import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { encrypted, iv } = await req.json();

    if (!encrypted || !iv) {
      return new Response(
        JSON.stringify({ error: 'Encrypted password and IV are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      console.error('ENCRYPTION_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Decryption not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert encryption key from hex string to Uint8Array
    const keyBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      keyBytes[i] = parseInt(encryptionKey.substring(i * 2, i * 2 + 2), 16) || 0;
    }

    // Import the key for AES-GCM decryption
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Decode base64 to bytes
    const encryptedBytes = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));

    // Decrypt the password
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      cryptoKey,
      encryptedBytes
    );

    // Decode to string
    const decoder = new TextDecoder();
    const password = decoder.decode(decryptedBuffer);

    console.log('Password decrypted successfully');

    return new Response(
      JSON.stringify({ password }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Decryption error:', error);
    return new Response(
      JSON.stringify({ error: 'Decryption failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
