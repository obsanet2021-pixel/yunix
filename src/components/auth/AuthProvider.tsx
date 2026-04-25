// ✅ GOOD - Following Lovable's exact pattern
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { validateSessionToken, createSessionForUser, revokeSessionToken, revokeAllUserSessions, type SessionWithUser } from '@/lib/session';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  customSession: SessionWithUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, meta?: any) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  role: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [customSession, setCustomSession] = useState<SessionWithUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing custom session
    const checkCustomSession = async () => {
      const storedToken = localStorage.getItem('custom_session_token');
      if (storedToken) {
        const validSession = await validateSessionToken(storedToken);
        if (validSession && new Date(validSession.expires_at) > new Date() && !validSession.revoked) {
          setCustomSession(validSession);

          // Get user from Supabase auth
          const { data: { user: supabaseUser } } = await supabase.auth.getUser();
          setUser(supabaseUser);
        } else {
          localStorage.removeItem('custom_session_token');
        }
      }
    };

    checkCustomSession();

    // ✅ CRITICAL ORDER: Subscribe FIRST, then fetch (Lovable's key insight)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    // THEN fetch existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };

    setUser(data.user);

    // Create custom session
    const customToken = crypto.randomUUID();
    try {
      const ipAddress = await fetchIP();
      await createSessionForUser(
        data.user.id,
        email,
        customToken,
        ipAddress,
        navigator.userAgent
      );

      localStorage.setItem('custom_session_token', customToken);
      const sessionData = await validateSessionToken(customToken);
      setCustomSession(sessionData);

      handlePostAuthRedirect(data.user);
    } catch (sessionError) {
      console.error('Failed to create custom session:', sessionError);
      // Continue with sign-in even if custom session fails
    }

    return { error: null };
  };

  const signUp = async (email: string, password: string, meta?: any) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: meta,
      },
    });
    return { error };
  };

  const signOut = async () => {
    if (customSession) {
      try {
        await revokeSessionToken(localStorage.getItem('custom_session_token')!);
      } catch (error) {
        console.error('Failed to revoke custom session:', error);
      }
    }

    localStorage.removeItem('custom_session_token');
    setCustomSession(null);
    await supabase.auth.signOut();
  };

  const updatePassword = async (newPassword: string, sessionToken?: string) => {
    // If sessionToken is provided, this is a password reset
    if (sessionToken) {
      try {
        // Validate the session token
        const validSession = await validateSessionToken(sessionToken);
        if (!validSession || new Date(validSession.expires_at) <= new Date() || validSession.revoked) {
          return { error: new Error('Invalid or expired session') };
        }

        // Update password using Supabase auth (requires user to be authenticated)
        // First, we need to get the user from the session
        const { data: { user: sessionUser }, error: userError } = await supabase.auth.getUser();
        if (userError || !sessionUser) {
          return { error: new Error('User not authenticated') };
        }

        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) return { error };

        // Revoke the reset session
        await revokeSessionToken(sessionToken);

        return { error: null };
      } catch (error) {
        return { error: error as Error };
      }
    }

    // Regular password update (user is already authenticated)
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error };

    // Revoke all custom sessions on password change
    if (user) {
      try {
        await revokeAllUserSessions(user.id);
        localStorage.removeItem('custom_session_token');
        setCustomSession(null);
      } catch (sessionError) {
        console.error('Failed to revoke sessions on password change:', sessionError);
      }
    }

    return { error: null };
  };

  const handlePostAuthRedirect = (user: User) => {
    const roleRoutes: Record<string, string> = {
      'CEO': '/app/admin/ceo',
      'COO': '/app/admin/staff/coo',
      'CTO': '/app/admin/staff/cto',
      'CFO': '/app/admin/staff/cfo',
      'Course Manager': '/app/admin/staff/course-manager',
      'Support Specialist': '/app/admin/staff/support',
      'QA Tester': '/app/admin/staff/qa',
      'Data Analyst': '/app/admin/staff/analytics',
      'Data Analyts': '/app/admin/staff/analytics',
      'Plaque Order Manager': '/app/admin/staff/plaque-orders',
      'order Manager': '/app/admin/staff/plaque-orders',
      'Social Media Manager': '/app/admin/staff/marketing',
      'Marketing': '/app/admin/staff/marketing',
    };

    const role = user.user_metadata?.role || customSession?.user_role || 'user';
    const redirectPath = roleRoutes[role] || '/dashboard';

    // Use React Router for navigation
    window.location.href = redirectPath;
  };

  const role = customSession?.user_role || user?.user_metadata?.role || null;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      customSession,
      loading,
      signIn,
      signUp,
      signOut,
      updatePassword,
      role
    }}>
      {children}
    </AuthContext.Provider>
  );
}

async function fetchIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
