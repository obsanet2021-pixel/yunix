import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function AcceptInvite() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [settingPassword, setSettingPassword] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [staffData, setStaffData] = useState<{ name: string; role: string; email: string } | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    handleInviteCallback();
  }, []);

  const handleInviteCallback = async () => {
    try {
      // Check for auth session from invite link
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
      }

      // Check URL hash for tokens (Supabase invite flow)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (accessToken && refreshToken && type === 'invite') {
        // Set the session from the invite link
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (error) {
          console.error('Error setting session:', error);
          toast({
            title: 'Invalid Invitation',
            description: 'This invitation link is invalid or has expired.',
            variant: 'destructive'
          });
          navigate('/auth');
          return;
        }

        if (data.user) {
          // Link staff record with user
          await linkStaffAccount(data.user.id, data.user.email!);
          
          // Check if user needs to set password
          const userData = data.user.user_metadata;
          setStaffData({
            name: userData?.name || data.user.email?.split('@')[0] || 'Staff',
            role: userData?.role || 'Staff',
            email: data.user.email || ''
          });
          setNeedsPassword(true);
        }
      } else if (session?.user) {
        // Already has session, check if staff
        const staffInfo = await getStaffInfo(session.user.email!);
        if (staffInfo) {
          setStaffData({
            name: staffInfo.name,
            role: staffInfo.role,
            email: session.user.email || ''
          });
          // User might be returning, check if password was set
          setNeedsPassword(true);
        } else {
          // Not a staff member, redirect
          navigate('/app/dashboard');
          return;
        }
      } else {
        // No session and no tokens, invalid access
        toast({
          title: 'Invalid Access',
          description: 'Please use the invitation link sent to your email.',
          variant: 'destructive'
        });
        navigate('/auth');
        return;
      }
    } catch (error) {
      console.error('Error handling invite:', error);
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive'
      });
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const linkStaffAccount = async (userId: string, email: string) => {
    try {
      // First try the new secure function
      const { data: currentUser } = await supabase.auth.getUser();
      if (currentUser.user) {
        const { error } = await supabase.rpc('link_staff_account_secure', {
          _user_id: userId,
          _user_email: email,
          _admin_user_id: currentUser.user.id
        });

        if (error) {
          console.error('Error linking staff account (secure):', error);
          // Fallback to old function
          await supabase.rpc('link_staff_account', {
            _user_id: userId,
            _user_email: email
          });
        }
      } else {
        // Fallback to old function
        const { error } = await supabase.rpc('link_staff_account', {
          _user_id: userId,
          _user_email: email
        });

        if (error) {
          console.error('Error linking staff account:', error);
          // Final fallback: direct update
          await supabase
            .from('staff')
            .update({ user_id: userId, status: 'active' })
            .eq('email', email.toLowerCase());
        }
      }
    } catch (error) {
      console.error('Error in linkStaffAccount:', error);
    }
  };

  const getStaffInfo = async (email: string) => {
    const { data } = await supabase
      .from('staff')
      .select(`
        name,
        role:admin_roles(name)
      `)
      .eq('email', email.toLowerCase())
      .single();

    if (data) {
      const roleData = Array.isArray(data.role) ? data.role[0] : data.role;
      return {
        name: data.name,
        role: roleData?.name || 'Staff'
      };
    }
    return null;
  };

  const handleSetPassword = async () => {
    if (password.length < 6) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 6 characters',
        variant: 'destructive'
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords Do Not Match',
        description: 'Please make sure your passwords match',
        variant: 'destructive'
      });
      return;
    }

    setSettingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      toast({
        title: 'Account Activated!',
        description: 'Welcome to YUNIX. Redirecting to your dashboard...',
      });

      // Small delay then redirect
      setTimeout(() => {
        navigate('/app/dashboard');
      }, 1500);
    } catch (error: any) {
      console.error('Password update error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to set password',
        variant: 'destructive'
      });
    } finally {
      setSettingPassword(false);
    }
  };

  const handleSkip = () => {
    toast({
      title: 'Welcome to YUNIX!',
      description: 'You can set your password later in settings.',
    });
    navigate('/app/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Setting up your account...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (needsPassword && staffData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to YUNIX!</CardTitle>
            <CardDescription>
              Set your password to complete account setup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="font-medium text-lg">{staffData.name}</p>
              <p className="text-primary font-semibold">{staffData.role}</p>
              <p className="text-sm text-muted-foreground">{staffData.email}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Create Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={settingPassword}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  disabled={settingPassword}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Button 
                onClick={handleSetPassword} 
                className="w-full" 
                disabled={settingPassword || !password || !confirmPassword}
              >
                {settingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Setting Password...
                  </>
                ) : (
                  'Set Password & Continue'
                )}
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleSkip} 
                className="w-full"
                disabled={settingPassword}
              >
                Skip for now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
