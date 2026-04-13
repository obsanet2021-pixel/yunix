import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  name: string;
  roleName: string;
  staffId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, roleName, staffId }: InviteRequest = await req.json();

    console.log(`Processing invitation for ${email} as ${roleName}`);

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get app URL for redirect
    const appUrl = "https://yunix.lovable.app";
    const redirectUrl = `${appUrl}/auth/accept-invite`;

    // Use Supabase native invite - sends email automatically
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectUrl,
      data: {
        name: name,
        role: roleName,
        staff_id: staffId
      }
    });

    if (inviteError) {
      console.error("Error sending invite:", inviteError);
      
      // If user already exists, they might just need to login
      if (inviteError.message?.includes("already been registered")) {
        // Update staff record to link with existing user
        const { data: existingUser } = await supabase.auth.admin.listUsers();
        const user = existingUser?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
        
        if (user) {
          await supabase
            .from("staff")
            .update({ user_id: user.id, status: 'active' })
            .eq("id", staffId);
            
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "User already exists. Staff record linked.",
              alreadyExists: true
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
      }
      
      throw new Error(`Failed to send invite: ${inviteError.message}`);
    }

    console.log("Supabase invite sent successfully to:", email);

    // Update staff record to mark invitation sent
    const { error: updateError } = await supabase
      .from("staff")
      .update({ 
        invite_token: inviteData?.user?.id || 'invited',
        status: 'pending'
      })
      .eq("id", staffId);

    if (updateError) {
      console.error("Error updating staff record:", updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invitation sent successfully via Supabase Auth",
        userId: inviteData?.user?.id
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-staff-invite function:", error);
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
