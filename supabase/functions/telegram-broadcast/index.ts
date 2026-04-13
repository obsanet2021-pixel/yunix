import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const MAX_BROADCASTS_PER_DAY = 3;

interface BroadcastRequest {
  action: 'send_broadcast' | 'save_draft' | 'get_drafts' | 'get_history' | 'get_stats';
  broadcast_id?: string;
  title?: string;
  message?: string;
  image_url?: string;
  target_audience?: 'all' | 'verified';
}

// Format message as per the official Yunix standard
function formatBroadcastMessage(title: string, message: string): string {
  return `🐺 YUNIX OFFICIAL UPDATE

${title}

${message}

— Yunix System Notification`;
}

// Send message to a single user via Telegram
async function sendTelegramMessage(chatId: number, text: string, imageUrl?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (imageUrl) {
      // Send photo with caption (appears inline in chat)
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: imageUrl,
          caption: text,
          parse_mode: 'HTML',
        }),
      });
      const result = await response.json();
      if (!result.ok) {
        return { success: false, error: result.description || 'Failed to send photo' };
      }
    } else {
      // Send text message only
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
        }),
      });
      const result = await response.json();
      if (!result.ok) {
        return { success: false, error: result.description || 'Failed to send message' };
      }
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error sending Telegram message:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Telegram Broadcast Function Started ===');
    
    // Validate environment variables
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract token from Bearer token format
    const token = authHeader.replace('Bearer ', '');
    
    // Use service role client to validate the JWT token directly
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError) {
      console.error('Auth error:', userError.message);
      return new Response(
        JSON.stringify({ error: 'Authentication failed: ' + userError.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!user) {
      console.error('No user found from token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - no user found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id, user.email);

    // Check if user is CEO using the RPC function
    const { data: isCeo, error: ceoCheckError } = await supabaseAdmin.rpc('is_ceo', { _user_id: user.id });
    
    if (ceoCheckError) {
      console.error('Error checking CEO status:', ceoCheckError.message);
    }
    
    console.log('CEO check result:', isCeo);
    
    // If RPC fails, try direct query as fallback
    let hasAccess = isCeo;
    if (!hasAccess) {
      console.log('CEO RPC returned false, trying direct staff query...');
      const { data: staffData, error: staffError } = await supabaseAdmin
        .from('staff')
        .select(`
          id,
          user_id,
          email,
          role:admin_roles(name)
        `)
        .or(`user_id.eq.${user.id},email.ilike.${user.email}`)
        .single();
      
      if (staffError) {
        console.error('Staff query error:', staffError.message);
      } else if (staffData) {
        const roleName = Array.isArray(staffData.role) ? staffData.role[0]?.name : staffData.role?.name;
        console.log('Staff found:', staffData.id, 'Role:', roleName);
        hasAccess = roleName === 'CEO';
      }
    }

    if (!hasAccess) {
      console.error('Access denied - user is not CEO');
      return new Response(
        JSON.stringify({ error: 'Only CEO can manage broadcasts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Access granted - proceeding with broadcast operation');

    // Get staff record for created_by
    const { data: staffRecord } = await supabaseAdmin
      .from('staff')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const body: BroadcastRequest = await req.json();
    const { action } = body;

    // Handle different actions
    switch (action) {
      case 'get_stats': {
        // Get today's broadcast count for rate limiting display
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { count } = await supabaseAdmin
          .from('telegram_broadcasts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'sent')
          .gte('sent_at', today.toISOString());

        // Get total linked users count
        const { count: totalUsers } = await supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .not('telegram_chat_id', 'is', null);

        const { count: verifiedUsers } = await supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .not('telegram_chat_id', 'is', null)
          .not('telegram_linked_at', 'is', null);

        return new Response(
          JSON.stringify({
            broadcasts_today: count || 0,
            max_per_day: MAX_BROADCASTS_PER_DAY,
            total_linked_users: totalUsers || 0,
            verified_linked_users: verifiedUsers || 0,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_drafts': {
        const { data: drafts, error } = await supabaseAdmin
          .from('telegram_broadcasts')
          .select('*')
          .eq('status', 'draft')
          .order('updated_at', { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify({ drafts }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_history': {
        const { data: history, error } = await supabaseAdmin
          .from('telegram_broadcasts')
          .select('*')
          .neq('status', 'draft')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        return new Response(
          JSON.stringify({ history }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'save_draft': {
        const { title, message, image_url, target_audience, broadcast_id } = body;

        if (!title || !message) {
          return new Response(
            JSON.stringify({ error: 'Title and message are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (broadcast_id) {
          // Update existing draft
          const { data, error } = await supabaseAdmin
            .from('telegram_broadcasts')
            .update({
              title,
              message,
              image_url: image_url || null,
              target_audience: target_audience || 'all',
              updated_at: new Date().toISOString(),
            })
            .eq('id', broadcast_id)
            .eq('status', 'draft')
            .select()
            .single();

          if (error) throw error;
          return new Response(
            JSON.stringify({ success: true, broadcast: data }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Create new draft
          const { data, error } = await supabaseAdmin
            .from('telegram_broadcasts')
            .insert({
              title,
              message,
              image_url: image_url || null,
              target_audience: target_audience || 'all',
              status: 'draft',
              created_by: staffRecord?.id || null,
            })
            .select()
            .single();

          if (error) throw error;
          return new Response(
            JSON.stringify({ success: true, broadcast: data }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'send_broadcast': {
        const { title, message, image_url, target_audience, broadcast_id } = body;

        if (!title || !message) {
          return new Response(
            JSON.stringify({ error: 'Title and message are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Rate limiting check
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { count: todayCount } = await supabaseAdmin
          .from('telegram_broadcasts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'sent')
          .gte('sent_at', today.toISOString());

        if ((todayCount || 0) >= MAX_BROADCASTS_PER_DAY) {
          return new Response(
            JSON.stringify({ 
              error: `Rate limit exceeded. Maximum ${MAX_BROADCASTS_PER_DAY} broadcasts per day.`,
              broadcasts_today: todayCount,
              max_per_day: MAX_BROADCASTS_PER_DAY,
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get recipients based on target audience
        let recipientsQuery = supabaseAdmin
          .from('profiles')
          .select('telegram_chat_id, email')
          .not('telegram_chat_id', 'is', null);

        if (target_audience === 'verified') {
          recipientsQuery = recipientsQuery.not('telegram_linked_at', 'is', null);
        }

        const { data: recipients, error: recipientsError } = await recipientsQuery;
        if (recipientsError) throw recipientsError;

        if (!recipients || recipients.length === 0) {
          return new Response(
            JSON.stringify({ error: 'No recipients found with linked Telegram accounts' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create or update broadcast record
        let broadcastRecord;
        if (broadcast_id) {
          const { data, error } = await supabaseAdmin
            .from('telegram_broadcasts')
            .update({
              title,
              message,
              image_url: image_url || null,
              target_audience: target_audience || 'all',
              status: 'sent',
              sent_at: new Date().toISOString(),
              total_recipients: recipients.length,
            })
            .eq('id', broadcast_id)
            .select()
            .single();
          if (error) throw error;
          broadcastRecord = data;
        } else {
          const { data, error } = await supabaseAdmin
            .from('telegram_broadcasts')
            .insert({
              title,
              message,
              image_url: image_url || null,
              target_audience: target_audience || 'all',
              status: 'sent',
              sent_at: new Date().toISOString(),
              total_recipients: recipients.length,
              created_by: staffRecord?.id || null,
            })
            .select()
            .single();
          if (error) throw error;
          broadcastRecord = data;
        }

        // Format the message
        const formattedMessage = formatBroadcastMessage(title, message);

        // Send to all recipients
        let successfulSends = 0;
        let failedSends = 0;
        const logs: any[] = [];

        for (const recipient of recipients) {
          const result = await sendTelegramMessage(
            recipient.telegram_chat_id,
            formattedMessage,
            image_url || undefined
          );

          logs.push({
            broadcast_id: broadcastRecord.id,
            recipient_chat_id: recipient.telegram_chat_id,
            recipient_email: recipient.email,
            status: result.success ? 'sent' : 'failed',
            error_message: result.error || null,
          });

          if (result.success) {
            successfulSends++;
          } else {
            failedSends++;
          }

          // Small delay to avoid rate limiting from Telegram
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Insert all logs
        if (logs.length > 0) {
          await supabaseAdmin.from('telegram_broadcast_logs').insert(logs);
        }

        // Update broadcast with final counts
        await supabaseAdmin
          .from('telegram_broadcasts')
          .update({
            successful_sends: successfulSends,
            failed_sends: failedSends,
          })
          .eq('id', broadcastRecord.id);

        console.log(`Broadcast ${broadcastRecord.id}: Sent to ${successfulSends}/${recipients.length} users`);

        return new Response(
          JSON.stringify({
            success: true,
            broadcast_id: broadcastRecord.id,
            total_recipients: recipients.length,
            successful_sends: successfulSends,
            failed_sends: failedSends,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('Error in telegram-broadcast function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});