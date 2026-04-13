import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReminderNotificationRequest {
  reminder_id: string;
  assigned_to_staff_id: string;
  title: string;
  description?: string | null;
  priority: string;
  due_date?: string | null;
  created_by_staff_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const telegramBotToken = Deno.env.get('TELEGRAM_SUPPORT_BOT_TOKEN');

    if (!telegramBotToken) {
      console.error('TELEGRAM_SUPPORT_BOT_TOKEN not configured');
      return new Response(
        JSON.stringify({ sent: false, reason: 'bot_not_configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: ReminderNotificationRequest = await req.json();

    console.log('Received reminder notification request:', payload);

    const { assigned_to_staff_id, title, description, priority, due_date, created_by_staff_id } = payload;

    // Get assigned staff member's details
    const { data: assignedStaff, error: staffError } = await supabase
      .from('staff')
      .select('id, name, user_id')
      .eq('id', assigned_to_staff_id)
      .single();

    if (staffError || !assignedStaff) {
      console.error('Staff not found:', staffError);
      return new Response(
        JSON.stringify({ sent: false, reason: 'staff_not_found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get creator's name
    const { data: creatorStaff } = await supabase
      .from('staff')
      .select('name')
      .eq('id', created_by_staff_id)
      .single();

    const creatorName = creatorStaff?.name || 'COO';

    // Try to get Telegram chat ID from telegram_support_agents first
    let telegramChatId: number | null = null;

    const { data: supportAgent } = await supabase
      .from('telegram_support_agents')
      .select('telegram_chat_id')
      .eq('staff_id', assigned_to_staff_id)
      .eq('is_active', true)
      .single();

    if (supportAgent?.telegram_chat_id) {
      telegramChatId = supportAgent.telegram_chat_id;
      console.log('Found chat ID from telegram_support_agents:', telegramChatId);
    }

    // Fallback: Try profiles table if staff has linked user_id
    if (!telegramChatId && assignedStaff.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('telegram_chat_id')
        .eq('id', assignedStaff.user_id)
        .single();

      if (profile?.telegram_chat_id) {
        telegramChatId = profile.telegram_chat_id;
        console.log('Found chat ID from profiles:', telegramChatId);
      }
    }

    if (!telegramChatId) {
      console.log('Staff not linked to Telegram:', assignedStaff.name);
      return new Response(
        JSON.stringify({ 
          sent: false, 
          reason: 'not_linked',
          staff_name: assignedStaff.name 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build priority emoji
    const priorityEmojis: Record<string, string> = {
      low: '🔵',
      normal: '🟢',
      high: '🟠',
      urgent: '🔴',
    };
    const priorityEmoji = priorityEmojis[priority] || '🟢';

    // Format due date
    let dueDateText = 'No deadline';
    if (due_date) {
      const date = new Date(due_date);
      dueDateText = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }

    // Build message
    let message = `📋 *New Reminder Assigned*\n\n`;
    message += `*Title:* ${escapeMarkdown(title)}\n`;
    message += `*Priority:* ${priorityEmoji} ${capitalize(priority)}\n`;
    message += `*Due:* ${dueDateText}\n`;
    
    if (description) {
      message += `\n_${escapeMarkdown(description)}_\n`;
    }
    
    message += `\n👤 *Assigned by:* ${escapeMarkdown(creatorName)}\n`;
    message += `\n⚠️ _Please check your dashboard to manage this task._`;

    // Send Telegram message
    const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const telegramResult = await telegramResponse.json();

    if (!telegramResult.ok) {
      console.error('Telegram API error:', telegramResult);
      return new Response(
        JSON.stringify({ 
          sent: false, 
          reason: 'telegram_error',
          error: telegramResult.description 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Reminder notification sent successfully to:', assignedStaff.name);

    return new Response(
      JSON.stringify({ 
        sent: true, 
        staff_name: assignedStaff.name 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending reminder notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        sent: false, 
        reason: 'error',
        error: errorMessage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
