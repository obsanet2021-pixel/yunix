import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { revokeSessionToken } from '../shared/session.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return buildResponse({ status: 'ok', service: 'logout' }, 200);
  }

  if (req.method !== 'POST') {
    return buildResponse({
      success: false,
      data: null,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST is allowed' }
    }, 405);
  }

  const authHeader = req.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const sessionToken = match?.[1]?.trim();

  if (!sessionToken) {
    return buildResponse({
      success: false,
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization token' }
    }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    return buildResponse({
      success: false,
      data: null,
      error: { code: 'CONFIG_ERROR', message: 'Server configuration error' }
    }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    await revokeSessionToken(supabase, sessionToken);
    return buildResponse({
      success: true,
      data: { action: 'SESSION_REVOKED' },
      error: null
    }, 200);
  } catch (error) {
    return buildResponse({
      success: false,
      data: null,
      error: { code: 'REVOCATION_FAILED', message: 'Unable to log out' }
    }, 500);
  }
};

serve(handler);
