import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const supportBotToken = Deno.env.get('TELEGRAM_SUPPORT_BOT_TOKEN');
    const ceoBotToken = Deno.env.get('CEO_BOT_TOKEN');
    const deliveryBotToken = Deno.env.get('DELIVERY_BOT_TOKEN');

    const { message } = await req.json();
    const testMessage = message || '🧪 This is a test from Yunix';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const results: Record<string, unknown>[] = [];

    // 1. Send via Support Bot to all linked support agents
    if (supportBotToken) {
      const { data: supportAgents } = await supabase
        .from('telegram_support_agents')
        .select('telegram_chat_id, telegram_username, staff_id')
        .eq('is_active', true)
        .not('telegram_chat_id', 'is', null);

      for (const agent of supportAgents || []) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${supportBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: agent.telegram_chat_id,
              text: `📢 *Support Bot Test*\n\n${testMessage}\n\n_Sent to staff via Support Bot_`,
              parse_mode: 'Markdown',
            }),
          });
          const result = await res.json();
          results.push({ bot: 'Support Bot', chat_id: agent.telegram_chat_id, success: result.ok });
        } catch (e) {
          results.push({ bot: 'Support Bot', chat_id: agent.telegram_chat_id, success: false, error: String(e) });
        }
      }
    }

    // 2. Send via CEO Bot
    if (ceoBotToken) {
      const { data: ceoConfig } = await supabase
        .from('ceo_telegram_config')
        .select('telegram_chat_id, group_chat_id')
        .eq('is_active', true)
        .single();

      if (ceoConfig?.telegram_chat_id) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${ceoBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: ceoConfig.telegram_chat_id,
              text: `🎯 *CEO Bot Test*\n\n${testMessage}\n\n_Sent via CEO Bot_`,
              parse_mode: 'Markdown',
            }),
          });
          const result = await res.json();
          results.push({ bot: 'CEO Bot (Private)', chat_id: ceoConfig.telegram_chat_id, success: result.ok });
        } catch (e) {
          results.push({ bot: 'CEO Bot (Private)', success: false, error: String(e) });
        }
      }

      if (ceoConfig?.group_chat_id) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${ceoBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: ceoConfig.group_chat_id,
              text: `🎯 *CEO Bot Test*\n\n${testMessage}\n\n_Sent via CEO Bot to Group_`,
              parse_mode: 'Markdown',
            }),
          });
          const result = await res.json();
          results.push({ bot: 'CEO Bot (Group)', chat_id: ceoConfig.group_chat_id, success: result.ok });
        } catch (e) {
          results.push({ bot: 'CEO Bot (Group)', success: false, error: String(e) });
        }
      }
    }

    // 3. Send via Delivery Bot to all linked agents
    if (deliveryBotToken) {
      const { data: deliveryAgents } = await supabase
        .from('delivery_bot_agents')
        .select('telegram_chat_id, telegram_username, staff_id')
        .eq('is_active', true)
        .not('telegram_chat_id', 'is', null);

      for (const agent of deliveryAgents || []) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${deliveryBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: agent.telegram_chat_id,
              text: `📦 *Delivery Bot Test*\n\n${testMessage}\n\n_Sent via Delivery Bot_`,
              parse_mode: 'Markdown',
            }),
          });
          const result = await res.json();
          results.push({ bot: 'Delivery Bot', chat_id: agent.telegram_chat_id, success: result.ok });
        } catch (e) {
          results.push({ bot: 'Delivery Bot', chat_id: agent.telegram_chat_id, success: false, error: String(e) });
        }
      }
    }

    // 4. Send via Main User Bot (to users with linked Telegram)
    if (telegramBotToken) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('telegram_chat_id, name, email')
        .not('telegram_chat_id', 'is', null)
        .limit(5); // Limit to first 5 users for test

      for (const profile of profiles || []) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: profile.telegram_chat_id,
              text: `🔔 *Main Bot Test*\n\n${testMessage}\n\n_Sent via Yunix Official Bot_`,
              parse_mode: 'Markdown',
            }),
          });
          const result = await res.json();
          results.push({ bot: 'Main User Bot', chat_id: profile.telegram_chat_id, name: profile.name, success: result.ok });
        } catch (e) {
          results.push({ bot: 'Main User Bot', chat_id: profile.telegram_chat_id, success: false, error: String(e) });
        }
      }
    }

    console.log('Test broadcast results:', results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test broadcast sent',
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending test broadcast:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
