import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
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
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [isStaffEmail, setIsStaffEmail] = useState(false);
  const [staffRoleName, setStaffRoleName] = useState<string | null>(null);
  const [showTelegramConnect, setShowTelegramConnect] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState<string | null>(null);
  const isSignupInProgress = useRef(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkStaffEmail = async (emailToCheck: string) => {
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
      await supabase.rpc('link_staff_account', { 
        _user_id: userId, 
        _user_email: userEmail 
      });
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

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      navigate(`/auth/update-password${hash}`, { replace: true });
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handlePostAuthRedirect(session.user.id, session.user.email || '');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY')) {
        // Skip redirect if this is a fresh signup - Telegram connect screen will handle it
        if (isSignupInProgress.current) {
          return;
        }
        await handlePostAuthRedirect(session.user.id, session.user.email || '');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handlePostAuthRedirect = async (userId: string, userEmail: string) => {
    const { data: staff } = await supabase
      .from("staff")
      .select(`id, role:admin_roles(name)`)
      .eq("email", userEmail.toLowerCase())
      .single();

    if (staff) {
      await linkStaffUser(userId, userEmail);
      const role = Array.isArray(staff.role) ? staff.role[0] : staff.role;
      const redirectRoute = getRedirectRoute(role?.name || null);
      navigate(redirectRoute, { replace: true });
    } else {
      navigate("/app/dashboard", { replace: true });
    }
  };

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
      const response = await supabase.functions.invoke('generate-telegram-otp', {
        body: { email, purpose: 'password_reset' }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { telegramLink: link, alreadyLinked, otpSent } = response.data;

      if (alreadyLinked && otpSent) {
        toast({
          title: "Code Sent!",
          description: "Check your Telegram for the verification code.",
        });
        setResetStep('enter_otp');
      } else {
        setTelegramLink(link);
        setResetStep('connect_telegram');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectTelegram = () => {
    window.open(telegramLink, '_blank');
    toast({
      title: "Telegram Opened",
      description: "Click START in the bot to receive your code.",
    });
    setResetStep('enter_otp');
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the 6-digit code from Telegram.",
        variant: "destructive",
      });
      return;
    }

    setVerifyingOTP(true);
    try {
      const response = await supabase.functions.invoke('verify-telegram-otp', {
        body: { email, otpCode, purpose: 'password_reset' }
      });

      if (response.error || !response.data?.verified) {
        throw new Error(response.data?.error || 'Invalid or expired code');
      }

      toast({
        title: "Code Verified!",
        description: "Now set your new password.",
      });
      setResetStep('new_password');
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid or expired OTP code",
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

      const response = await supabase.functions.invoke('verify-password-reset-otp', {
        body: { 
          email, 
          otp: otpCode,
          newPassword: validated.password 
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setResetStep('success');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to reset password",
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
      const response = await supabase.functions.invoke('generate-telegram-otp', {
        body: { email, purpose: 'password_reset' }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { alreadyLinked, otpSent, telegramLink: link } = response.data;

      if (alreadyLinked && otpSent) {
        toast({
          title: "Code Resent!",
          description: "Check your Telegram for the new code.",
        });
      } else {
        setTelegramLink(link);
        window.open(link, '_blank');
        toast({
          title: "Telegram Opened",
          description: "Click START in the bot to receive your code.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend code",
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

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: validated.firstName,
            last_name: validated.lastName,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered") && staffCheck.isStaff) {
          toast({
            title: "Staff account exists",
            description: "Signing you in instead...",
          });
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: validated.email,
            password: validated.password,
          });
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
      } else if (data.user) {
        if (staffCheck.isStaff) {
          isSignupInProgress.current = false; // Reset for staff - let them redirect
          await linkStaffUser(data.user.id, validated.email);
          toast({
            title: "Welcome to the team!",
            description: `Account created. Redirecting to your ${staffCheck.roleName} dashboard...`,
          });
          // Navigate staff to their dashboard
          const redirectRoute = getRedirectRoute(staffCheck.roleName);
          navigate(redirectRoute, { replace: true });
        } else {
          // Show Telegram connection step for new regular users
          // isSignupInProgress stays true to prevent auth redirect
          setNewUserId(data.user.id);
          setNewUserEmail(validated.email);
          setShowTelegramConnect(true);
          toast({
            title: "Account created!",
            description: "Please connect Telegram to receive notifications.",
          });
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else if (data.user) {
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
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in with Google",
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
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate Telegram link",
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

    // STEP 2: Connect Telegram (only if not linked)
    if (resetStep === 'connect_telegram') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl text-center">Connect Telegram</CardTitle>
              <CardDescription className="text-center">
                To receive your verification code, please connect your Telegram account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Email: <span className="font-medium text-foreground">{email}</span>
              </p>
              
              <Button 
                className="w-full" 
                onClick={handleConnectTelegram}
              >
                <Send className="h-4 w-4 mr-2" />
                Connect Telegram
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>
        <Card>
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
  );
}