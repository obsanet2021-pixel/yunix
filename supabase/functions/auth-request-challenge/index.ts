/// <reference types="https://deno.land/x/types/deno.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestChallengeRequest {
  email: string;
  type: 'login' | 'password_reset' | 'telegram_link';
  debug?: boolean;
  trace_id?: string;
}

type DeliveryChannel = 'telegram' | 'email' | 'link';

type DeliveryStatus = 'pending' | 'delivered' | 'link_fallback' | 'failed';

type DeliveryAttempt = {
  channel: DeliveryChannel;
  transport: 'telegram' | 'email' | 'link';
  status: DeliveryStatus;
  step: string;
  timestamp: string;
  error?: string;
};

function isValidEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.includes('@') &&
    value.includes('.')
  );
}

function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (array[0] % 900000 + 100000).toString();
}

function generateToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function log(event: string, data: Record<string, any>) {
  console.log(JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    ...data
  }));
}

function buildResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}

function buildAttempt(
  channel: DeliveryChannel,
  transport: 'telegram' | 'email' | 'link',
  status: DeliveryStatus,
  step: string,
  error?: unknown
): DeliveryAttempt {
  return {
    channel,
    transport,
    status,
    step,
    timestamp: new Date().toISOString(),
    ...(error ? { error: String(error) } : {}),
  };
}

function buildChallengeLink(token: string): string {
  const appOrigin = Deno.env.get('PUBLIC_APP_URL')
    || Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app')
    || 'https://app.yunix.com';

  return new URL(`/verify?token=${encodeURIComponent(token)}`, appOrigin).toString();
}

async function sendTelegramChallenge(chatId: string | number, otpCode: string, telegramBotToken: string) {
  const message = `🔐 YUNIX SECURITY CODE\n\nYour verification code is: ${otpCode}\n\nThis code expires in 5 minutes.\nDo not share this code with anyone.`;
  const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  });

  if (!telegramResponse.ok) {
    throw new Error(await telegramResponse.text());
  }

  return true;
}

async function sendEmailChallenge(resend: Resend, email: string, otpCode: string) {
  const { error } = await resend.emails.send({
    from: "Yunix <no-reply@yunix.com>",
    to: [email],
    subject: "Yunix Verification Code",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 40px 20px; margin: 0;">
        <div style="max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); border-radius: 16px; padding: 40px; border: 1px solid #333;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f59e0b; margin: 0; font-size: 28px; font-weight: 700;">YUNIX</h1>
            <p style="color: #888; margin-top: 8px; font-size: 14px;">Verification Code</p>
          </div>

          <p style="color: #ccc; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Your verification code is:
          </p>

          <div style="background: linear-gradient(135deg, #f59e0b22 0%, #f59e0b11 100%); border: 1px solid #f59e0b44; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="color: #888; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Your Code</p>
            <p style="color: #f59e0b; font-size: 36px; font-weight: 700; letter-spacing: 8px; margin: 0; font-family: monospace;">${otpCode}</p>
          </div>

          <p style="color: #888; font-size: 13px; line-height: 1.6; margin-bottom: 24px;">
            This code will expire in <strong style="color: #f59e0b;">5 minutes</strong>. If you didn't request this, please ignore this email.
          </p>

          <hr style="border: none; border-top: 1px solid #333; margin: 24px 0;">

          <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
            © ${new Date().getFullYear()} YUNIX Trading Platform
          </p>
        </div>
      </body>
      </html>
    `,
  });

  if (error) {
    throw error;
  }

  return true;
}

async function updateDeliveryState(
  supabase: ReturnType<typeof createClient>,
  challengeId: string,
  status: DeliveryStatus,
  attempts: DeliveryAttempt[]
) {
  await supabase
    .from('auth_challenges')
    .update({ delivery_status: status, delivery_attempts: attempts })
    .eq('id', challengeId);
}

const handler = async (req: Request): Promise<Response> => {
  const start = Date.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    log("HEALTH_CHECK", { service: "auth-request-challenge" });
    return buildResponse({ status: "ok", service: "auth-request-challenge" }, 200);
  }

  if (req.method !== "POST") {
    return buildResponse({
      success: false,
      data: null,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only POST method is allowed'
      },
      meta: {
        duration_ms: Date.now() - start
      }
    }, 405);
  }

  let body: unknown;
  let traceId: string | undefined;
  let debugMode = false;

  try {
    try {
      body = await req.json();
    } catch (parseError) {
      log("INVALID_JSON", { error: String(parseError) });
      return buildResponse({
        success: false,
        data: null,
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body'
        },
        meta: {
          duration_ms: Date.now() - start
        }
      }, 400);
    }

    const { email, type, debug, trace_id } = body as RequestChallengeRequest;
    debugMode = debug === true;
    traceId = typeof trace_id === 'string' && trace_id.trim() ? trace_id.trim() : undefined;

    const normalizedEmail = isValidEmail(email) ? email.trim().toLowerCase() : '';
    if (!normalizedEmail) {
      log("VALIDATION_FAILED", { email, type, debug: debugMode, trace_id: traceId, reason: 'invalid_email' });
      return buildResponse({
        success: false,
        data: null,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Valid email is required'
        },
        meta: {
          duration_ms: Date.now() - start,
          ...(debugMode ? { debug: true, trace_id: traceId } : {})
        }
      }, 400);
    }

    const validTypes = ['login', 'password_reset', 'telegram_link'];
    if (!validTypes.includes(type)) {
      log("VALIDATION_FAILED", { email: normalizedEmail, type, debug: debugMode, trace_id: traceId, reason: 'invalid_type' });
      return buildResponse({
        success: false,
        data: null,
        error: {
          code: 'INVALID_TYPE',
          message: 'Invalid challenge type'
        },
        meta: {
          duration_ms: Date.now() - start,
          ...(debugMode ? { debug: true, trace_id: traceId } : {})
        }
      }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    log("REQUEST_STARTED", { email: normalizedEmail, type, debug: debugMode, trace_id: traceId, method: req.method });

    if (!supabaseUrl || !supabaseServiceKey) {
      log('CONFIG_ERROR', { email: normalizedEmail, type, debug: debugMode, trace_id: traceId });
      return buildResponse({
        success: false,
        data: null,
        error: {
          code: 'CONFIG_ERROR',
          message: 'Server configuration error'
        },
        meta: {
          duration_ms: Date.now() - start,
          ...(debugMode ? { debug: true, trace_id: traceId } : {})
        }
      }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    // Rate limiting with atomic check
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentChallenges, error: countError } = await supabase
      .from('auth_challenges')
      .select('id')
      .eq('email', normalizedEmail)
      .gte('created_at', fiveMinutesAgo);

    if (countError) {
      log('RATE_LIMIT_CHECK_FAILED', { email: normalizedEmail, error: countError, trace_id: traceId });
      return buildResponse({
        success: false,
        data: null,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to check request limits'
        },
        meta: {
          duration_ms: Date.now() - start,
          ...(debugMode ? { debug: true, trace_id: traceId } : {})
        }
      }, 500);
    }

    if (recentChallenges && recentChallenges.length >= 3) {
      log('RATE_LIMIT_HIT', { email: normalizedEmail, attempts: recentChallenges.length, trace_id: traceId });
      return buildResponse({
        success: false,
        data: null,
        error: {
          code: 'RATE_LIMIT',
          message: 'Too many requests'
        },
        meta: {
          duration_ms: Date.now() - start,
          attempts: recentChallenges.length,
          ...(debugMode ? { debug: true, trace_id: traceId } : {})
        }
      }, 429);
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, telegram_chat_id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileError) {
      log('PROFILE_LOOKUP_FAILED', { email: normalizedEmail, type, error: profileError, trace_id: traceId });
      return buildResponse({
        success: false,
        data: null,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Failed to verify user account'
        },
        meta: {
          duration_ms: Date.now() - start,
          ...(debugMode ? { debug: true, trace_id: traceId } : {})
        }
      }, 500);
    }

    log('PROFILE_LOOKUP_SUCCESS', {
      email: normalizedEmail,
      found: !!profile,
      hasTelegram: !!profile?.telegram_chat_id,
      trace_id: traceId
    });

    const userId = profile?.id || null;
    const hasTelegram = !!profile?.telegram_chat_id;

    if (!userId && type === 'password_reset') {
      log('PASSWORD_RESET_NO_ACCOUNT', { email: normalizedEmail, trace_id: traceId });
      return buildResponse({
        success: true,
        data: {
          action: 'CHALLENGE_CREATED',
          message: 'If an account exists, a verification code will be sent.'
        },
        error: null,
        meta: {
          duration_ms: Date.now() - start,
          ...(debugMode ? { debug: true, trace_id: traceId } : {})
        }
      }, 200);
    }

    const initialChannel: DeliveryChannel = hasTelegram && telegramBotToken ? 'telegram' : resend ? 'email' : 'link';
    const otpCode = generateOTP();
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const codeHash = await hashOTP(otpCode);

    const { error: markUsedError } = await supabase
      .from('auth_challenges')
      .update({ used: true })
      .eq('email', normalizedEmail)
      .eq('type', type)
      .eq('used', false);

    if (markUsedError) {
      log('MARK_PREVIOUS_CHALLENGES_USED_FAILED', { email: normalizedEmail, type, error: markUsedError, trace_id: traceId });
    }

    const insertPayload = {
      email: normalizedEmail,
      user_id: userId,
      type,
      channel: initialChannel,
      code_hash: codeHash,
      token,
      expires_at: expiresAt,
      used: false,
      delivery_attempts: [],
      delivery_status: 'pending',
      metadata: {
        telegram_chat_id: profile?.telegram_chat_id || null
      }
    };

    const { data: insertedChallenge, error: insertError } = await supabase
      .from('auth_challenges')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError || !insertedChallenge) {
      log('AUTH_CHALLENGE_FAILED', { email: normalizedEmail, step: 'insert_challenge', error: insertError, trace_id: traceId });
      return buildResponse({
        success: false,
        data: null,
        error: {
          code: 'CHALLENGE_FAILED',
          message: 'Failed to create verification challenge'
        },
        meta: {
          duration_ms: Date.now() - start,
          ...(debugMode ? { debug: true, trace_id: traceId } : {})
        }
      }, 500);
    }

    const challengeId = insertedChallenge.id;
    const deliveryAttempts: DeliveryAttempt[] = [];
    let actualDelivery: DeliveryChannel = initialChannel;
    let deliveryStatus: DeliveryStatus = 'pending';
    let deliverySuccess = false;

    const fallbackToLink = async () => {
      actualDelivery = 'link';
      deliveryStatus = 'link_fallback';
      deliveryAttempts.push(buildAttempt(initialChannel, 'link', 'link_fallback', 'fallback_to_link'));
      log('FALLBACK_TO_LINK', { email: normalizedEmail, initialChannel, trace_id: traceId });
    };

    const sendEmailFallback = async () => {
      actualDelivery = 'email';
      try {
        await sendEmailChallenge(resend as Resend, normalizedEmail, otpCode);
        deliverySuccess = true;
        deliveryStatus = 'delivered';
        deliveryAttempts.push(buildAttempt('email', 'email', 'delivered', 'email_fallback'));
        log('EMAIL_FALLBACK_SUCCESS', { email: normalizedEmail, trace_id: traceId });
      } catch (error) {
        deliveryAttempts.push(buildAttempt('email', 'email', 'failed', 'email_fallback', error));
        log('EMAIL_FALLBACK_FAILED', { email: normalizedEmail, error: String(error), trace_id: traceId });
        await fallbackToLink();
      }
    };

    if (initialChannel === 'telegram' && profile?.telegram_chat_id && telegramBotToken) {
      try {
        await sendTelegramChallenge(profile.telegram_chat_id, otpCode, telegramBotToken);
        deliverySuccess = true;
        deliveryStatus = 'delivered';
        deliveryAttempts.push(buildAttempt('telegram', 'telegram', 'delivered', 'telegram_send'));
        log('TELEGRAM_SEND_SUCCESS', { email: normalizedEmail, trace_id: traceId });
      } catch (error) {
        deliveryAttempts.push(buildAttempt('telegram', 'telegram', 'failed', 'telegram_send', error));
        log('TELEGRAM_SEND_FAILED', { email: normalizedEmail, error: String(error), trace_id: traceId });
        if (resend) {
          await sendEmailFallback();
        } else {
          await fallbackToLink();
        }
      }
    } else if (initialChannel === 'email' && resend) {
      try {
        await sendEmailChallenge(resend, normalizedEmail, otpCode);
        deliverySuccess = true;
        deliveryStatus = 'delivered';
        deliveryAttempts.push(buildAttempt('email', 'email', 'delivered', 'email_send'));
        log('EMAIL_SEND_SUCCESS', { email: normalizedEmail, trace_id: traceId });
      } catch (error) {
        deliveryAttempts.push(buildAttempt('email', 'email', 'failed', 'email_send', error));
        log('EMAIL_SEND_FAILED', { email: normalizedEmail, error: String(error), trace_id: traceId });
        await fallbackToLink();
      }
    } else {
      await fallbackToLink();
    }

    try {
      await updateDeliveryState(supabase, challengeId, deliveryStatus, deliveryAttempts);
    } catch (updateError) {
      log('UPDATE_DELIVERY_STATE_FAILED', { email: normalizedEmail, challengeId, error: String(updateError), trace_id: traceId });
    }

    const baseMeta = {
      expires_at: expiresAt,
      delivery_status: deliveryStatus,
      duration_ms: Date.now() - start,
      ...(debugMode ? { debug: true, trace_id: traceId, delivery_attempts: deliveryAttempts } : {})
    };

    if (deliverySuccess) {
      return buildResponse({
        success: true,
        data: {
          action: 'CHALLENGE_SENT',
          channel: actualDelivery
        },
        error: null,
        meta: baseMeta
      }, 200);
    }

    const challengeLink = buildChallengeLink(token);
    return buildResponse({
      success: true,
      data: {
        action: 'CHALLENGE_LINK',
        channel: 'link',
        challenge_link: challengeLink
      },
      error: null,
      meta: baseMeta
    }, 200);
  } catch (error) {
    log('AUTH_CHALLENGE_FAILED', { step: 'unexpected_error', error: String(error), trace_id: traceId });
    return buildResponse({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong'
      },
      meta: {
        duration_ms: Date.now() - start
      }
    }, 500);
  }
};

serve(handler);
