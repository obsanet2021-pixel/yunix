import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { z } from "zod";
import { Eye, EyeOff, Loader2, ArrowLeft, Send, CheckCircle, MessageCircle, Chrome } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const authSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

const signupSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  firstName: z.string().trim().min(1, "First name is required").max(50, "First name must be less than 50 characters"),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name must be less than 50 characters"),
});

const passwordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters").max(100),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

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
  'Developer': '/app/admin/staff/cto',
};

// Password Reset Flow Steps
type ResetStep = 'email' | 'connect_telegram' | 'enter_otp' | 'new_password' | 'success';

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>('email');
  const [telegramLink, setTelegramLink] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [isStaffEmail, setIsStaffEmail] = useState(false);
  const [staffRoleName, setStaffRoleName] = useState<string | null>(null);
  const [showTelegramConnect, setShowTelegramConnect] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState<string | null>(null);
  const { signIn, signUp, user: authUser } = useAuth();
  const isSignupInProgress = useRef(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isEnabled } = useFeatureToggles();

  const checkStaffEmail = async (emailToCheck: string) => {
    // Use the new has_role RPC function
    const { data: userData } = await supabase.auth.getUser();
    
    if (userData.user) {
      const { data: isStaff } = await supabase.rpc('has_role', {
        _user_id: userData.user.id,
        _role: 'staff'
      });
      
      if (isStaff) {
        setIsStaffEmail(true);
        setStaffRoleName('staff');
        return { isStaff: true, roleName: 'staff', staffId: userData.user.id };
      }
    }
    
    // Fallback to old staff table check for existing data
    const { data: staff } = await supabase
      .from("staff")
      .select(`id, role:admin_roles(name)`)
      .eq("email", emailToCheck.toLowerCase())
      .single();

    if (staff) {
      const role = Array.isArray(staff.role) ? staff.role[0] : staff.role;
      setIsStaffEmail(true);
      setStaffRoleName(role?.name || null);
      return { isStaff: true, roleName: role?.name || null, staffId: staff.id };
    }
    
    setIsStaffEmail(false);
    setStaffRoleName(null);
    return { isStaff: false, roleName: null, staffId: null };
  };

  const linkStaffUser = async (userId: string, userEmail: string) => {
    try {
      // First try the new secure function
      const { data: currentUser } = await supabase.auth.getUser();
      if (currentUser.user) {
        await supabase.rpc('link_staff_account_secure', { 
          _user_id: userId, 
          _user_email: userEmail,
          _admin_user_id: currentUser.user.id
        });
      } else {
        // Fallback to old function
        await supabase.rpc('link_staff_account', { 
          _user_id: userId, 
          _user_email: userEmail 
        });
      }
    } catch (error) {
      console.error("Error linking staff account:", error);
    }
  };

  const getRedirectRoute = (roleName: string | null): string => {
    if (roleName && roleRoutes[roleName]) {
      return roleRoutes[roleName];
    }
    return '/app/dashboard';
  };

  const handlePostAuthRedirect = useCallback(async (userId: string, userEmail: string) => {
    // Check if user has staff role via new system
    const { data: isStaff } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'staff'
    });
    
    if (isStaff) {
      await linkStaffUser(userId, userEmail);
      // Get actual role name from staff table
      const { data: staff } = await supabase
        .from("staff")
        .select(`role:admin_roles(name)`)
        .eq("email", userEmail.toLowerCase())
        .single();
      const role = staff ? (Array.isArray(staff.role) ? staff.role[0] : staff.role) : null;
      const redirectRoute = getRedirectRoute(role?.name || null);
      navigate(redirectRoute, { replace: true });
    } else {
      navigate("/app/dashboard", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      navigate(`/auth/update-password${hash}`, { replace: true });
      return;
    }

    // Use authUser from useAuth instead of direct getSession
    if (authUser && !isSignupInProgress.current) {
      handlePostAuthRedirect(authUser.id, authUser.email || '');
    }

    // Keep auth state listener for events like PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY')) {
        if (isSignupInProgress.current) {
          return;
        }
        await handlePostAuthRedirect(session.user.id, session.user.email || '');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, authUser, handlePostAuthRedirect]);

  // STEP 1: Send verification code - check if user has Telegram linked
  const handleSendVerificationCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      toast({
        title: "Email required",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('forgot-password', {
        body: { email }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { success, action, message, delivery, telegram_link, requiresTelegramLink, challengeId: returnedChallengeId } = response.data;

      if (success && action === 'OTP_SENT') {
        if (delivery === 'security') {
          // User not found - show generic success for security (don't reveal if email exists)
          toast({
            title: "Request Received",
            description: "If this email is registered, you will receive a verification code.",
          });
          // Don't proceed to OTP entry since user doesn't exist
          return;
        }
        const deliveryMethod = delivery === 'telegram' ? 'Telegram' : delivery === 'console' ? 'server logs' : 'email';
        toast({
          title: "Code Sent!",
          description: delivery === 'console' 
            ? "Verification code generated (check server logs for testing)."
            : `Check your ${deliveryMethod} for the verification code.`,
        });
        setChallengeId(returnedChallengeId);
        setResetStep('enter_otp');
      } else if (action === 'TELEGRAM_LINK_REQUIRED' || requiresTelegramLink) {
        toast({
          title: "Connect Telegram",
          description: "Please connect your Telegram account to receive the reset code.",
        });
        setTelegramLink(telegram_link);
        setChallengeId(returnedChallengeId);
        setResetStep('connect_telegram');
      } else {
        throw new Error(message || 'Failed to send verification code');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to send verification code";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the 6-digit code from your Telegram.",
        variant: "destructive",
      });
      return;
    }

    if (!challengeId) {
      toast({
        title: "Error",
        description: "Challenge ID missing. Please restart the process.",
        variant: "destructive",
      });
      return;
    }

    setVerifyingOTP(true);
    try {
      const response = await supabase.functions.invoke('auth-verify-challenge', {
        body: { challengeId, code: otpCode }
      });

      if (response.error || !response.data?.success) {
        throw new Error(response.data?.error || 'Invalid or expired code');
      }

      // Store the recovery token for password reset
      const recoveryToken = response.data.recoveryToken;
      if (recoveryToken) {
        try {
          localStorage.setItem('reset_recovery_token', recoveryToken);
        } catch (error) {
          console.error('Failed to store recovery token:', error);
        }
      }

      toast({
        title: "Code Verified!",
        description: "Now set your new password.",
      });
      setResetStep('new_password');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Invalid or expired OTP code";
      toast({
        title: "Verification failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setVerifyingOTP(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = passwordSchema.parse({ password: newPassword, confirmPassword });
      setLoading(true);

      try {
        const recoveryToken = localStorage.getItem('reset_recovery_token');
        if (!recoveryToken) {
          throw new Error('Session expired. Please restart the password reset process.');
        }
      } catch (error) {
        console.error('Error getting recovery token from local storage:', error);
        throw new Error('Failed to retrieve recovery token');
      }

      // Use the recovery token to update password via Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: validated.password
      });

      if (error) {
        throw error;
      }

      // Clean up
      try {
        localStorage.removeItem('reset_recovery_token');
      } catch (error) {
        console.error('Failed to remove recovery token:', error);
      }

      toast({
        title: "Password Updated!",
        description: "Your password has been successfully reset.",
      });
      setResetStep('success');
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        const message = error instanceof Error ? error.message : "Failed to reset password";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('forgot-password', {
        body: { email }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Code Resent!",
        description: "Check your email for the new reset code.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to resend code";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = signupSchema.parse({ email, password, firstName, lastName });
      setLoading(true);

      const staffCheck = await checkStaffEmail(validated.email);

      // Set flag BEFORE signUp to prevent onAuthStateChange from redirecting
      if (!staffCheck.isStaff) {
        isSignupInProgress.current = true;
      }

      // Use useAuth's signUp instead of direct supabase call
      const { error } = await signUp(
        validated.email, 
        validated.password, 
        {
          first_name: validated.firstName,
          last_name: validated.lastName,
        }
      );

      if (error) {
        if (error.message.includes("already registered") && staffCheck.isStaff) {
          toast({
            title: "Staff account exists",
            description: "Signing you in instead...",
          });
          // Use useAuth's signIn
          const { error: signInError } = await signIn(validated.email, validated.password);
          if (signInError) {
            toast({
              title: "Sign in required",
              description: "Please use the Sign In tab with your password.",
              variant: "destructive",
            });
          }
        } else if (error.message.includes("already registered")) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Please sign in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        // Get the newly created user (need to fetch from auth)
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (currentUser) {
          if (staffCheck.isStaff) {
            isSignupInProgress.current = false;
            await linkStaffUser(currentUser.id, validated.email);
            toast({
              title: "Welcome to the team!",
              description: `Account created. Redirecting to your ${staffCheck.roleName} dashboard...`,
            });
            const redirectRoute = getRedirectRoute(staffCheck.roleName);
            navigate(redirectRoute, { replace: true });
          } else {
            // Show Telegram connection step
            isSignupInProgress.current = true;
            setNewUserId(currentUser.id);
            setNewUserEmail(validated.email);
            setShowTelegramConnect(true);
            toast({
              title: "Account created!",
              description: "Please connect Telegram to receive notifications.",
            });
          }
        }
      }
    } catch (error) {
      isSignupInProgress.current = false; // Reset on error
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = authSchema.parse({ email, password });
      setLoading(true);

      // Use useAuth's signIn
      const { error } = await signIn(validated.email, validated.password);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // On success, useAuth will update user state, and useEffect will handle redirect
        const staffCheck = await checkStaffEmail(validated.email);
        if (staffCheck.isStaff) {
          toast({
            title: "Welcome back!",
            description: `Signing in as ${staffCheck.roleName}...`,
          });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to sign in with Google";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetPasswordFlow = () => {
    setShowResetPassword(false);
    setResetStep('email');
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
    setTelegramLink("");
  };

  // Telegram Connect Step (for new signups)
  const handleConnectTelegramForNewUser = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('generate-telegram-otp', {
        body: { email: newUserEmail, purpose: 'new_user_link' }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { telegramLink: link, alreadyLinked } = response.data;

      if (alreadyLinked) {
        isSignupInProgress.current = false; // Reset flag before navigating
        toast({
          title: "Already Connected!",
          description: "Your Telegram is already linked. Proceeding to dashboard...",
        });
        navigate("/app/dashboard", { replace: true });
      } else {
        window.open(link, '_blank');
        toast({
          title: "Telegram Opened",
          description: "Click START in the bot to link your account, then continue.",
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to generate Telegram link";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const skipTelegramAndContinue = () => {
    isSignupInProgress.current = false; // Reset flag before navigating
    toast({
      title: "Telegram Not Connected",
      description: "You won't receive notifications. You can connect later from your profile.",
      variant: "default",
    });
    navigate("/app/dashboard", { replace: true });
  };

  // Password Reset Flow Views
  if (showResetPassword) {
    // STEP 5: Success
    if (resetStep === 'success') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-xl sm:text-2xl text-center">Password Reset Successfully!</CardTitle>
              <CardDescription className="text-center">
                Your password has been updated. You can now sign in with your new password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={resetPasswordFlow}
              >
                Go to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // STEP 4: New Password Form
    if (resetStep === 'new_password') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl text-center">Reset Password</CardTitle>
              <CardDescription className="text-center">
                Enter your new password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      );
    }

    // STEP 3: Enter OTP Code
    if (resetStep === 'connect_telegram') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl text-center">Connect Telegram</CardTitle>
              <CardDescription className="text-center">
                Connect your Telegram account to receive the password reset code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <MessageCircle className="h-16 w-16 text-primary" />
                <p className="text-sm text-muted-foreground text-center">
                  Click the button below to open Telegram and link your account
                </p>
              </div>

              <Button
                onClick={() => window.open(telegramLink, '_blank')}
                className="w-full"
                disabled={loading}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Open Telegram
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleSendVerificationCode}
                disabled={loading}
              >
                <Send className="h-4 w-4 mr-2" />
                I've Connected Telegram
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setResetStep('email')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (resetStep === 'enter_otp') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl text-center">Enter Verification Code</CardTitle>
              <CardDescription className="text-center">
                Enter the 6-digit code sent to your Telegram
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-muted-foreground text-center">
                  Code sent to: <span className="font-medium text-foreground">{email}</span>
                </p>
                
                <InputOTP 
                  maxLength={6} 
                  value={otpCode} 
                  onChange={(value) => setOtpCode(value)}
                  disabled={verifyingOTP}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>

                <p className="text-xs text-muted-foreground">
                  Code expires in 5 minutes
                </p>
              </div>

              <Button 
                onClick={handleVerifyOTP} 
                className="w-full" 
                disabled={otpCode.length !== 6 || verifyingOTP}
              >
                {verifyingOTP ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendOTP}
                disabled={loading}
              >
                <Send className="h-4 w-4 mr-2" />
                Resend Code
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={resetPasswordFlow}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // STEP 1: Enter Email
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl text-center">Reset Password</CardTitle>
            <CardDescription className="text-center">
              Enter your email to receive a verification code
            </CardDescription>
            {isStaffEmail && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge variant="secondary" className="bg-primary/20 text-primary">
                  Staff: {staffRoleName}
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendVerificationCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Verification Code"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={resetPasswordFlow}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Telegram Connect Step (for new signups)
  if (showTelegramConnect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-primary/10">
                <MessageCircle className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl text-center">
              Connect Telegram to Complete Setup
            </CardTitle>
            <CardDescription className="text-center">
              Yunix uses Telegram to send important notifications such as order updates, certificate status, and system alerts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              onClick={handleConnectTelegramForNewUser}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Opening Telegram...
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Connect Telegram
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Telegram is used as the official notification channel.
              <br />No marketing messages are sent.
            </p>

            <p className="text-xs text-center text-muted-foreground">
              By continuing, you agree to our{' '}
              <a 
                href="/terms" 
                target="_blank"
                className="text-primary hover:underline"
              >
                Terms of Service
              </a>
              {' '}and{' '}
              <a 
                href="/privacy" 
                target="_blank"
                className="text-primary hover:underline"
              >
                Privacy Policy
              </a>
            </p>

            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              onClick={skipTelegramAndContinue}
            >
              Skip for now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Sign In / Sign Up View
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Visual Panel - Left Side */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute -top-[100px] -right-[100px] w-[600px] h-[600px] rounded-full blur-[80px]" style={{ background: 'radial-gradient(circle, rgba(250,140,56,0.12) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-[50px] -left-[100px] w-[500px] h-[500px] rounded-full blur-[80px]" style={{ background: 'radial-gradient(circle, rgba(74,158,255,0.08) 0%, transparent 70%)' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center h-full p-12 text-center">
          <div className="max-w-md w-full mx-auto">
            <h1 className="font-display text-4xl lg:text-5xl font-extrabold mb-6 text-center">
              <span className="bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">
                Start Trading
              </span>
              <br />
              With Real Clarity
            </h1>
            <p className="text-lg text-muted-foreground mb-8 font-light text-center">
              Join over 100 traders who use YUNIX to track their edge, stay disciplined, and grow their accounts.
            </p>
          </div>
        </div>

        {/* Back Button */}
        <div className="absolute top-6 left-6 z-20">
          <Button variant="ghost" asChild className="bg-background/50 backdrop-blur-sm hover:bg-background/80">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>

      {/* Form Panel - Right Side */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-12 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="w-full max-w-md">
          {/* Mobile Back Button */}
          <div className="lg:hidden mb-4">
            <Button variant="ghost" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>

          <Card className="glow-card">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl text-center">WELCOME TO YUNIX</CardTitle>
              <CardDescription className="text-center">
                Sign in to your account or create a new one
              </CardDescription>
            {isStaffEmail && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge variant="secondary" className="bg-primary/20 text-primary">
                  Staff: {staffRoleName}
                </Badge>
              </div>
            )}
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password">Password</Label>
                        <button
                          type="button"
                          className="text-sm text-primary hover:underline"
                          onClick={() => setShowResetPassword(true)}
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={loading}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Signing in..." : isStaffEmail ? `Sign In as ${staffRoleName}` : "Sign In"}
                    </Button>

                    {isEnabled('google_sign_in') && (
                      <>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full"
                          onClick={handleGoogleSignIn}
                          disabled={loading}
                        >
                          <Chrome className="h-4 w-4 mr-2" />
                          Sign in with Google
                        </Button>
                      </>
                    )}
                  </form>
                </TabsContent>
                
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="signup-firstname">First Name *</Label>
                        <Input
                          id="signup-firstname"
                          type="text"
                          placeholder="John"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-lastname">Last Name *</Label>
                        <Input
                          id="signup-lastname"
                          type="text"
                          placeholder="Doe"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={loading}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      By signing up, you agree to our{" "}
                      <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
                      {" "}and{" "}
                      <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                    </p>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creating account..." : isStaffEmail ? `Join as ${staffRoleName}` : "Sign Up"}
                    </Button>

                    {isEnabled('google_sign_in') && (
                      <>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full"
                          onClick={handleGoogleSignIn}
                          disabled={loading}
                        >
                          <Chrome className="h-4 w-4 mr-2" />
                          Sign up with Google
                        </Button>
                      </>
                    )}
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-center border-t pt-4">
              <p className="text-xs text-muted-foreground">
                <Link to="/terms" className="hover:text-primary hover:underline">Terms of Service</Link>
                {" · "}
                <Link to="/privacy" className="hover:text-primary hover:underline">Privacy Policy</Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}