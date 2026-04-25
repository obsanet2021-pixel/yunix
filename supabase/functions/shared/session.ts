import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type SessionRecord = {
  id: number;
  email: string;
  user_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
  revoked: boolean;
};

export async function generateSessionToken(): Promise<string> {
  return crypto.randomUUID();
}

export async function hashSessionToken(token: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionForUser(
  supabase: SupabaseClient,
  userId: string,
  email: string,
  ipAddress: string | null = null,
  userAgent: string | null = null,
  maxSessions = 5,
  sessionDays = 7
): Promise<SessionRecord> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionDays * 24 * 60 * 60 * 1000).toISOString();

  // Clean up old sessions for this user
  const { data: activeSessions, error: activeError } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('revoked', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });

  if (activeError) {
    throw new Error(`Failed to read active sessions: ${activeError.message}`);
  }

  if (activeSessions && activeSessions.length >= maxSessions) {
    const sessionsToRevoke = activeSessions
      .slice(0, activeSessions.length - maxSessions + 1)
      .map((session: { id: number }) => session.id);

    if (sessionsToRevoke.length > 0) {
      const { error: revokeError } = await supabase
        .from('sessions')
        .update({ revoked: true })
        .in('id', sessionsToRevoke);

      if (revokeError) {
        throw new Error(`Failed to revoke old sessions: ${revokeError.message}`);
      }
    }
  }

  const sessionToken = await generateSessionToken();
  const tokenHash = await hashSessionToken(sessionToken);

  const { data: insertedSession, error: insertError } = await supabase
    .from('sessions')
    .insert([{
      email,
      user_id: userId,
      token_hash: tokenHash,
      created_at: now.toISOString(),
      expires_at: expiresAt,
      ip_address: ipAddress,
      user_agent: userAgent,
      revoked: false
    }])
    .select('*')
    .maybeSingle();

  if (insertError || !insertedSession) {
    throw new Error(`Failed to create session: ${insertError?.message ?? 'no session returned'}`);
  }

  // Return the session with the plain token for the client
  return { ...insertedSession, session_token: sessionToken } as SessionRecord & { session_token: string };
}

export async function validateSessionToken(
  supabase: SupabaseClient,
  sessionToken: string
): Promise<SessionRecord | null> {
  const tokenHash = await hashSessionToken(sessionToken);

  const { data: session, error } = await supabase
    .from('sessions')
    .select('id, email, user_id, token_hash, created_at, expires_at, ip_address, user_agent, revoked')
    .eq('token_hash', tokenHash)
    .eq('revoked', false)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to validate session: ${error.message}`);
  }

  return session as SessionRecord | null;
}

export async function revokeSessionToken(
  supabase: SupabaseClient,
  sessionToken: string
): Promise<boolean> {
  const tokenHash = await hashSessionToken(sessionToken);

  const { error } = await supabase
    .from('sessions')
    .update({ revoked: true, expires_at: new Date().toISOString() })
    .eq('token_hash', tokenHash)
    .eq('revoked', false);

  if (error) {
    throw new Error(`Failed to revoke session: ${error.message}`);
  }

  return true;
}
