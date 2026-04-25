import { supabase } from '@/integrations/supabase/client'

export interface SessionRecord {
  id: number;
  email: string;
  user_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  revoked: boolean;
  ip_address: string | null;
  user_agent: string | null;
}

export interface SessionWithUser extends SessionRecord {
  user_email: string;
  user_role: 'staff' | 'admin' | 'user';
}

export async function generateSessionToken(): Promise<string> {
  return crypto.randomUUID();
}

export async function hashSessionToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createSessionForUser(
  userId: string,
  email: string,
  token: string,
  ipAddress: string | null = null,
  userAgent: string | null = null,
  maxSessions = 5,
  sessionDays = 7
): Promise<SessionRecord> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionDays * 24 * 60 * 60 * 1000).toISOString();

  // Clean up old sessions for this user (may fail during sign-in before auth is complete)
  try {
    const { data: activeSessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('revoked', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });

    // Enforce session limit
    if (activeSessions && activeSessions.length >= maxSessions) {
      // Revoke oldest sessions
      const sessionsToRevoke = activeSessions.slice(0, activeSessions.length - maxSessions + 1);
      await supabase
        .from('sessions')
        .update({ revoked: true })
        .in('id', sessionsToRevoke.map(s => s.id));
    }
  } catch (_cleanupError) {
    // Ignore cleanup errors during sign-in (RLS may block reads before auth completes)
    console.warn('Session cleanup skipped during sign-in');
  }

  const tokenHash = await hashSessionToken(token);

  const { data, error } = await supabase.from('sessions').insert({
    email,
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    ip_address: ipAddress,
    user_agent: userAgent,
    revoked: false
  }).select().single();

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }

  return data;
}

export async function validateSessionToken(token: string): Promise<SessionWithUser | null> {
  try {
    const tokenHash = await hashSessionToken(token);

    const { data: session, error } = await supabase
      .from('sessions')
      .select(`
        id,
        email,
        user_id,
        token_hash,
        created_at,
        expires_at,
        revoked,
        ip_address,
        user_agent,
        profiles!inner(email, role)
      `)
      .eq('token_hash', tokenHash)
      .eq('revoked', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !session) {
      return null;
    }

    return {
      id: session.id,
      email: session.email,
      user_id: session.user_id,
      token_hash: session.token_hash,
      created_at: session.created_at,
      expires_at: session.expires_at,
      revoked: session.revoked,
      ip_address: session.ip_address,
      user_agent: session.user_agent,
      user_email: session.profiles.email,
      user_role: session.profiles.role || 'user'
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

export async function revokeSessionToken(token: string): Promise<void> {
  const tokenHash = await hashSessionToken(token);

  const { error } = await supabase
    .from('sessions')
    .update({ revoked: true })
    .eq('token_hash', tokenHash);

  if (error) {
    throw new Error(`Failed to revoke session: ${error.message}`);
  }
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ revoked: true })
    .eq('user_id', userId)
    .eq('revoked', false);

  if (error) {
    throw new Error(`Failed to revoke user sessions: ${error.message}`);
  }
}