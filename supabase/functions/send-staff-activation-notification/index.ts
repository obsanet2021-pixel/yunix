import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StaffNotificationRequest {
  staffMembers: Array<{
    name: string;
    email: string;
    role_name: string;
  }>;
}

const getRoleRoute = (roleName: string): string => {
  const routes: Record<string, string> = {
    'CEO': '/app/admin/ceo',
    'COO': '/app/admin/staff/coo',
    'CTO': '/app/admin/staff/cto',
    'CFO': '/app/admin/staff/cfo',
    'Course Manager': '/app/admin/staff/course-manager',
    'Marketing': '/app/admin/staff/marketing',
    'Social Media Manager': '/app/admin/staff/marketing',
    'QA Tester': '/app/admin/staff/qa',
    'Data Analyts': '/app/admin/staff/analytics',
    'Data Analyst': '/app/admin/staff/analytics',
    'order Manager': '/app/admin/staff/plaque-orders',
    'Order Manager': '/app/admin/staff/plaque-orders',
    'Backend Developer': '/app/admin/staff',
  };
  return routes[roleName] || '/app/admin/staff';
};

const sendEmail = async (to: string, subject: string, html: string) => {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "YUNIX <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to send email: ${error}`);
  }
  
  return res.json();
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { staffMembers }: StaffNotificationRequest = await req.json();
    
    console.log(`Sending activation notifications to ${staffMembers.length} staff members`);

    const results = [];
    
    for (const staff of staffMembers) {
      const dashboardRoute = getRoleRoute(staff.role_name);
      const dashboardUrl = `https://yunix.lovable.app${dashboardRoute}`;
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid rgba(212, 175, 55, 0.2);">
                      <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #d4af37; letter-spacing: 2px;">YUNIX</h1>
                      <p style="margin: 8px 0 0; color: #888; font-size: 14px;">Trading Platform</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">
                        Welcome, ${staff.name}! 🎉
                      </h2>
                      
                      <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
                        Great news! Your YUNIX staff account has been <strong style="color: #4ade80;">activated</strong> and you now have full access to your role-specific dashboard.
                      </p>
                      
                      <div style="background: rgba(212, 175, 55, 0.1); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 12px; padding: 20px; margin: 24px 0;">
                        <p style="margin: 0 0 8px; color: #888; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Role</p>
                        <p style="margin: 0; color: #d4af37; font-size: 20px; font-weight: 600;">${staff.role_name}</p>
                      </div>
                      
                      <p style="margin: 0 0 24px; color: #cccccc; font-size: 16px; line-height: 1.6;">
                        You can now sign in and access your dashboard to start managing your responsibilities.
                      </p>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #f5d76e 100%); color: #000000; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px;">
                              Access Your Dashboard →
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 32px 0 0; color: #888; font-size: 14px; text-align: center;">
                        Or sign in at: <a href="https://yunix.lovable.app/auth" style="color: #d4af37; text-decoration: none;">yunix.lovable.app</a>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 40px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(212, 175, 55, 0.1);">
                      <p style="margin: 0; color: #666; font-size: 12px; text-align: center;">
                        © 2024 YUNIX Trading Platform. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
      
      try {
        const emailResponse = await sendEmail(
          staff.email,
          "🎉 Your YUNIX Staff Account is Now Active!",
          emailHtml
        );

        console.log(`Email sent to ${staff.email}:`, emailResponse);
        results.push({ email: staff.email, success: true, response: emailResponse });
      } catch (emailError: any) {
        console.error(`Failed to send email to ${staff.email}:`, emailError);
        results.push({ email: staff.email, success: false, error: emailError.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Notification complete: ${successCount} sent, ${failureCount} failed`);

    return new Response(
      JSON.stringify({ 
        message: `Sent ${successCount} emails, ${failureCount} failed`,
        results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-staff-activation-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
