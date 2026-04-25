import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOTPRequest {
  email: string;
}

// Generate a random 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: SendOTPRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const resend = new Resend(resendApiKey);

    // Check if user exists
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error("Error listing users:", userError);
      return new Response(
        JSON.stringify({ error: "Failed to verify user" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const user = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      // Don't reveal that the user doesn't exist for security
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists, a verification code will be sent." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate OTP and set expiration (10 minutes)
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Delete any existing OTPs for this email
    await supabase
      .from("password_reset_otps")
      .delete()
      .eq("email", email.toLowerCase());

    // Insert new OTP
    const { error: insertError } = await supabase
      .from("password_reset_otps")
      .insert({
        email: email.toLowerCase(),
        otp_code: otpCode,
        expires_at: expiresAt
      });

    if (insertError) {
      console.error("Error inserting OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to generate verification code" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send OTP via Resend email
    const { error: emailError } = await resend.emails.send({
      from: "YUNIX <onboarding@resend.dev>",
      to: [email],
      subject: "Password Reset Verification Code",
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
              <p style="color: #888; margin-top: 8px; font-size: 14px;">Password Reset Request</p>
            </div>
            
            <p style="color: #ccc; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
              You requested to reset your password. Use the verification code below:
            </p>
            
            <div style="background: linear-gradient(135deg, #f59e0b22 0%, #f59e0b11 100%); border: 1px solid #f59e0b44; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <p style="color: #888; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Your Code</p>
              <p style="color: #f59e0b; font-size: 36px; font-weight: 700; letter-spacing: 8px; margin: 0; font-family: monospace;">${otpCode}</p>
            </div>
            
            <p style="color: #888; font-size: 13px; line-height: 1.6; margin-bottom: 24px;">
              This code will expire in <strong style="color: #f59e0b;">10 minutes</strong>. If you didn't request this, please ignore this email.
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

    if (emailError) {
      console.error("Error sending email:", emailError);
      // Clean up OTP if email failed
      await supabase
        .from("password_reset_otps")
        .delete()
        .eq("email", email.toLowerCase());
      
      return new Response(
        JSON.stringify({ error: "Failed to send verification email. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("OTP sent successfully to:", email);

    return new Response(
      JSON.stringify({ success: true, message: "Verification code sent to your email" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-password-reset-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
