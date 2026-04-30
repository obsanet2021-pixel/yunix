import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getSupabaseClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
};

const sendTelegramMessage = async (chatId: number, text: string, botToken: string) => {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
    }),
  });
  return response.json();
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient();
    const botToken = Deno.env.get('CEO_BOT_TOKEN');
    
    if (!botToken) {
      console.error('CEO_BOT_TOKEN not configured');
      return new Response(JSON.stringify({ error: 'Bot token not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { type, data } = body;

    // Input validation
    if (!type) {
      return new Response(JSON.stringify({ error: 'Missing required field: type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!data || typeof data !== 'object') {
      return new Response(JSON.stringify({ error: 'Missing or invalid data field' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Notify CEO request:', { type, data });

    // Get CEO config
    const { data: config } = await supabase
      .from('ceo_telegram_config')
      .select('telegram_chat_id, group_chat_id, auto_notify_new_orders')
      .eq('is_active', true)
      .single();
      
    if (!config) {
      console.log('No active CEO config found');
      return new Response(JSON.stringify({ ok: false, error: 'No CEO configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let message = '';
    
    switch (type) {
      case 'new_order':
        if (!config.auto_notify_new_orders) {
          return new Response(JSON.stringify({ ok: true, message: 'Auto-notify disabled' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        message = `🆕 <b>New Order Received!</b>\n\n` +
          `📋 <b>Order ID:</b> <code>${data.orderId?.slice(0, 8) || 'N/A'}</code>\n` +
          `👤 <b>Customer:</b> ${data.fullName || 'N/A'}\n` +
          `📐 <b>Size:</b> ${data.size || 'N/A'}\n` +
          `💰 <b>Price:</b> $${(data.price || 0).toFixed(2)}\n` +
          `🚚 <b>Delivery:</b> ${data.deliveryMethod || 'Standard'}\n` +
          `📍 <b>Address:</b> ${data.shippingAddress ? data.shippingAddress.substring(0, 50) + '...' : 'N/A'}\n\n` +
          `⏳ <b>Status:</b> Awaiting CEO Approval\n\n` +
          `💡 Use <code>/search ${data.orderId?.slice(0, 8)}</code> for details`;
        break;
        
      case 'payment_received':
        message = `💳 <b>Payment Submitted!</b>\n\n` +
          `📋 <b>Order ID:</b> <code>${data.orderId?.slice(0, 8) || 'N/A'}</code>\n` +
          `👤 <b>Customer:</b> ${data.fullName || 'N/A'}\n` +
          `💰 <b>Amount:</b> $${(data.amount || 0).toFixed(2)}\n` +
          `📱 <b>Method:</b> ${data.paymentMethod || 'N/A'}\n\n` +
          `⏳ <b>Status:</b> Awaiting Verification`;
        break;
        
      case 'order_status_change': {
        const emoji = data.newStatus === 'Delivered' ? '✅' : 
                      data.newStatus === 'Shipped' ? '🚚' :
                      data.newStatus === 'Rejected' ? '❌' : '📦';
        message = `${emoji} <b>Order Status Updated</b>\n\n` +
          `📋 <b>Order ID:</b> <code>${data.orderId?.slice(0, 8) || 'N/A'}</code>\n` +
          `👤 <b>Customer:</b> ${data.fullName || 'N/A'}\n` +
          `📊 <b>New Status:</b> ${data.newStatus}\n` +
          `📊 <b>Previous:</b> ${data.previousStatus || 'N/A'}`;
        break;
      }
        
      case 'customer_confirmed':
        message = `✅ <b>Delivery Confirmed by Customer!</b>\n\n` +
          `📋 <b>Order ID:</b> <code>${data.orderId?.slice(0, 8) || 'N/A'}</code>\n` +
          `👤 <b>Customer:</b> ${data.fullName || 'N/A'}\n` +
          `📅 <b>Confirmed:</b> ${new Date().toLocaleString()}\n\n` +
          `🎉 Order cycle complete!`;
        break;
        
      default:
        message = `🔔 <b>Notification</b>\n\n${JSON.stringify(data, null, 2)}`;
    }

    // Send to CEO private chat
    const result = await sendTelegramMessage(config.telegram_chat_id, message, botToken);
    console.log('Sent to CEO:', result);
    
    // Also send to group if configured
    if (config.group_chat_id) {
      const groupResult = await sendTelegramMessage(config.group_chat_id, message, botToken);
      console.log('Sent to group:', groupResult);
    }
    
    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in notify-ceo-order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
