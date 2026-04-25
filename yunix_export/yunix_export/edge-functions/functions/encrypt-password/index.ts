import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { password } = await req.json();

    if (!password) {
      return new Response(
        JSON.stringify({ error: 'Password is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const encryptionKey = Deno.env.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      console.error('ENCRYPTION_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Encryption not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a random 12-byte IV for AES-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Convert encryption key from hex string to Uint8Array (32 bytes for AES-256)
    const keyBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      keyBytes[i] = parseInt(encryptionKey.substring(i * 2, i * 2 + 2), 16) || 0;
    }

    // Import the key for AES-GCM encryption
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    // Encode password to bytes
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);

    // Encrypt the password
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      passwordBytes
    );

    // Convert to base64 for storage
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));
    const ivBase64 = btoa(String.fromCharCode(...iv));

    console.log('Password encrypted successfully');

    return new Response(
      JSON.stringify({
        encrypted: encryptedBase64,
        iv: ivBase64
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Encryption error:', error);
    return new Response(
      JSON.stringify({ error: 'Encryption failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
