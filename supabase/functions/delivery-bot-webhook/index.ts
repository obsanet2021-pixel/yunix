import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    from?: { id: number; username?: string; first_name?: string };
    text?: string;
  };
}

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
}

async function sendTelegramMessage(chatId: number, text: string, botToken: string) {
  console.log('Sending message to chat:', chatId, 'text length:', text.length);
  
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });
  
  const result = await response.json();
  console.log('Telegram API response:', JSON.stringify(result));
  
  return result;
}

async function isAuthorizedAgent(chatId: number): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('delivery_bot_agents')
    .select('id, is_active')
    .eq('telegram_chat_id', chatId)
    .eq('is_active', true)
    .single();
    
  return !error && !!data;
}

async function linkDeliveryAgent(chatId: number, email: string, username: string | undefined, botToken: string) {
  const supabase = getSupabaseClient();
  
  // Check if staff member exists
  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('id, name, role_id')
    .ilike('email', email)
    .single();
    
  if (staffError || !staff) {
    await sendTelegramMessage(chatId, '❌ Email not found in staff records. Please check your email address.', botToken);
    return;
  }
  
  // Check if role is authorized (CEO, CFO, COO, Order Manager)
  const { data: role } = await supabase
    .from('admin_roles')
    .select('name')
    .eq('id', staff.role_id)
    .single();
    
  const authorizedRoles = ['CEO', 'CFO', 'COO', 'Order Manager', 'Plaque Manager'];
  if (!role || !authorizedRoles.includes(role.name)) {
    await sendTelegramMessage(chatId, '❌ Your role is not authorized for delivery management.', botToken);
    return;
  }
  
  // Check if already linked
  const { data: existing } = await supabase
    .from('delivery_bot_agents')
    .select('id')
    .eq('staff_id', staff.id)
    .single();
    
  if (existing) {
    // Update existing record
    await supabase
      .from('delivery_bot_agents')
      .update({
        telegram_chat_id: chatId,
        telegram_username: username,
        is_active: true,
        linked_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    // Create new record
    await supabase
      .from('delivery_bot_agents')
      .insert({
        staff_id: staff.id,
        telegram_chat_id: chatId,
        telegram_username: username,
        is_active: true,
        linked_at: new Date().toISOString(),
      });
  }
  
  await sendTelegramMessage(
    chatId,
    `✅ Successfully linked as <b>${staff.name}</b>!\n\nYou can now use delivery commands. Type /help to see available commands.`,
    botToken
  );
}

async function getPendingDeliveryOrders(chatId: number, botToken: string) {
  const supabase = getSupabaseClient();
  console.log('Fetching pending delivery orders...');

  const { data: orders, error } = await supabase
    .from('plaque_orders')
    .select('id, full_name, shipping_address, phone, size, delivery_method, status, payment_status')
    .in('status', ['Processing', 'Awaiting Approval', 'Pending'])
    .order('created_at', { ascending: true })
    .limit(10);

  console.log('Query result:', { ordersCount: orders?.length, error: error?.message });
    
  if (error || !orders || orders.length === 0) {
    await sendTelegramMessage(chatId, '📦 No orders awaiting delivery at the moment.', botToken);
    return;
  }
  
  let message = `📦 <b>Orders Awaiting Delivery (${orders.length})</b>\n\n`;
  
  orders.forEach((order, index) => {
    message += `${index + 1}. <code>${escapeHtml(order.id.slice(0, 8))}</code>\n`;
    message += `   👤 ${escapeHtml(order.full_name)}\n`;
    message += `   📱 ${escapeHtml(order.phone)}\n`;
    message += `   📍 ${escapeHtml(order.shipping_address.substring(0, 50))}...\n`;
    message += `   📐 Size: ${escapeHtml(order.size)}\n`;
    message += `   🚚 ${escapeHtml(order.delivery_method)}\n\n`;
  });
  
  message += '\nUse <code>/shipped ddd58cc9</code> or <code>/delivered ddd58cc9</code> to update status.';
  
  await sendTelegramMessage(chatId, message, botToken);
}

function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function notifyCustomerShipped(orderId: string, confirmationCode: string, customerName: string) {
  const supabase = getSupabaseClient();
  const mainBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  
  if (!mainBotToken) {
    console.log('TELEGRAM_BOT_TOKEN not configured, skipping customer notification');
    return;
  }

  // Get customer's telegram_chat_id from the order -> user -> profile
  const { data: order, error: orderError } = await supabase
    .from('plaque_orders')
    .select('user_id')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    console.log('Could not find order for customer notification');
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('telegram_chat_id, name')
    .eq('id', order.user_id)
    .single();

  if (profileError || !profile?.telegram_chat_id) {
    console.log('Customer does not have Telegram linked, skipping notification');
    return;
  }

  const message = `📦 <b>Your Order Has Been Shipped!</b>\n\n` +
    `Hello ${escapeHtml(profile.name || customerName)}!\n\n` +
    `Your plaque order is on its way. 🚚\n\n` +
    `<b>Confirmation Code:</b> <code>${confirmationCode}</code>\n\n` +
    `When you receive your order, please confirm delivery by sending:\n` +
    `<code>/received ${confirmationCode}</code>\n\n` +
    `Thank you for your order! 🐺`;

  await fetch(`https://api.telegram.org/bot${mainBotToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: profile.telegram_chat_id,
      text: message,
      parse_mode: 'HTML',
    }),
  });

  console.log('Customer notified about shipment');
}

async function markOrderShipped(chatId: number, orderId: string, botToken: string) {
  const supabase = getSupabaseClient();

  // Get agent info
  const { data: agent, error: agentError } = await supabase
    .from('delivery_bot_agents')
    .select('staff_id')
    .eq('telegram_chat_id', chatId)
    .maybeSingle();

  if (agentError || !agent?.staff_id) {
    console.log('Agent lookup failed:', agentError?.message);
    await sendTelegramMessage(chatId, '❌ You are not linked as a delivery agent. Please /link your staff email again.', botToken);
    return;
  }

  const key = orderId.trim();

  // NOTE: plaque_orders.id is UUID, so PostgREST ilike/like filters won't work reliably.
  // We fetch a small recent window and match the prefix in code.
  const { data: candidates, error: listError } = await supabase
    .from('plaque_orders')
    .select('id, full_name, status')
    .order('created_at', { ascending: false })
    .limit(50);

  if (listError || !candidates) {
    console.log('Order list failed:', listError?.message);
    await sendTelegramMessage(chatId, '❌ Failed to look up orders. Please try again.', botToken);
    return;
  }

  const order = candidates.find((o) => o.id === key || o.id.startsWith(key));
  if (!order) {
    await sendTelegramMessage(chatId, `❌ Order not found: <code>${escapeHtml(key)}</code>\n\nTip: run /orders and copy the first 8 characters shown.`, botToken);
    return;
  }

  // Generate confirmation code
  const confirmationCode = generateConfirmationCode();

  // Update order with confirmation code
  const { error: updateError } = await supabase
    .from('plaque_orders')
    .update({
      delivery_status: 'shipped',
      shipped_at: new Date().toISOString(),
      shipped_by: agent.staff_id,
      delivery_confirmation_code: confirmationCode,
    })
    .eq('id', order.id);

  console.log('Marked as shipped:', { orderId: order.id, confirmationCode, error: updateError?.message });

  if (updateError) {
    await sendTelegramMessage(chatId, '❌ Failed to update order status.', botToken);
    return;
  }

  // Notify customer via main bot
  await notifyCustomerShipped(order.id, confirmationCode, order.full_name);

  await sendTelegramMessage(
    chatId,
    `✅ Order <code>${escapeHtml(order.id.slice(0, 8))}</code> marked as <b>SHIPPED</b>\n\n` +
    `👤 Customer: ${escapeHtml(order.full_name)}\n` +
    `🔐 Confirmation Code: <code>${confirmationCode}</code>\n\n` +
    `📱 Customer has been notified via Telegram (if linked).`,
    botToken
  );
}

async function markOrderDelivered(chatId: number, orderId: string, botToken: string) {
  const supabase = getSupabaseClient();

  // Get agent info
  const { data: agent, error: agentError } = await supabase
    .from('delivery_bot_agents')
    .select('staff_id')
    .eq('telegram_chat_id', chatId)
    .maybeSingle();

  if (agentError || !agent?.staff_id) {
    console.log('Agent lookup failed:', agentError?.message);
    await sendTelegramMessage(chatId, '❌ You are not linked as a delivery agent. Please /link your staff email again.', botToken);
    return;
  }

  const key = orderId.trim();

  const { data: candidates, error: listError } = await supabase
    .from('plaque_orders')
    .select('id, full_name, status')
    .order('created_at', { ascending: false })
    .limit(50);

  if (listError || !candidates) {
    console.log('Order list failed:', listError?.message);
    await sendTelegramMessage(chatId, '❌ Failed to look up orders. Please try again.', botToken);
    return;
  }

  const order = candidates.find((o) => o.id === key || o.id.startsWith(key));
  if (!order) {
    await sendTelegramMessage(chatId, `❌ Order not found: <code>${escapeHtml(key)}</code>\n\nTip: run /orders and copy the first 8 characters shown.`, botToken);
    return;
  }

  // Update order - use 'Delivered' which is a valid status per check constraint
  const { error: updateError } = await supabase
    .from('plaque_orders')
    .update({
      delivery_status: 'delivered',
      delivered_at: new Date().toISOString(),
      delivered_by: agent.staff_id,
      status: 'Delivered',
    })
    .eq('id', order.id);

  console.log('Marked as delivered:', { orderId: order.id, error: updateError?.message });

  if (updateError) {
    await sendTelegramMessage(chatId, '❌ Failed to update order status.', botToken);
    return;
  }

  await sendTelegramMessage(
    chatId,
    `✅ Order <code>${escapeHtml(order.id.slice(0, 8))}</code> marked as <b>DELIVERED</b>\n\n👤 Customer: ${escapeHtml(order.full_name)}`,
    botToken
  );
}

async function searchOrder(chatId: number, orderId: string, botToken: string) {
  const supabase = getSupabaseClient();

  const key = orderId.trim();

  const { data: candidates, error } = await supabase
    .from('plaque_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !candidates) {
    await sendTelegramMessage(chatId, '❌ Failed to search orders. Please try again.', botToken);
    return;
  }

  const order = candidates.find((o) => o.id === key || o.id.startsWith(key));

  if (!order) {
    await sendTelegramMessage(chatId, `❌ Order not found: <code>${escapeHtml(key)}</code>`, botToken);
    return;
  }

  const message = `🔍 <b>Order Details</b>\n\n` +
    `📋 ID: <code>${escapeHtml(order.id.slice(0, 8))}</code>\n` +
    `👤 Name: ${escapeHtml(order.full_name)}\n` +
    `📱 Phone: ${escapeHtml(order.phone)}\n` +
    `📍 Address: ${escapeHtml(order.shipping_address)}\n` +
    `📐 Size: ${escapeHtml(order.size)}\n` +
    `🚚 Method: ${escapeHtml(order.delivery_method)}\n` +
    `📦 Status: ${escapeHtml(order.status)}\n` +
    `🚛 Delivery: ${escapeHtml(order.delivery_status || 'Pending')}\n` +
    `💰 Payment: ${escapeHtml(order.payment_status || 'Unknown')}`;

  await sendTelegramMessage(chatId, message, botToken);
}

async function getDeliverySummary(chatId: number, botToken: string) {
  const supabase = getSupabaseClient();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get today's deliveries
  const { data: todayDeliveries } = await supabase
    .from('plaque_orders')
    .select('id')
    .gte('delivered_at', today.toISOString());
    
  // Get pending deliveries
  const { data: pending } = await supabase
    .from('plaque_orders')
    .select('id')
    .in('status', ['Approved', 'Processing'])
    .eq('payment_status', 'paid');
    
  // Get shipped orders
  const { data: shipped } = await supabase
    .from('plaque_orders')
    .select('id')
    .eq('delivery_status', 'shipped');
    
  const message = `📊 <b>Delivery Summary</b>\n\n` +
    `📦 Pending Delivery: <b>${pending?.length || 0}</b>\n` +
    `🚚 Currently Shipped: <b>${shipped?.length || 0}</b>\n` +
    `✅ Delivered Today: <b>${todayDeliveries?.length || 0}</b>`;
    
  await sendTelegramMessage(chatId, message, botToken);
}

async function showHelp(chatId: number, botToken: string) {
  const message = `🚚 <b>YUNIX Delivery Bot</b>\n\n` +
    `<b>Available Commands:</b>\n\n` +
    `/orders - View orders awaiting delivery\n` +
    `/shipped &lt;ID&gt; - Mark order as shipped\n` +
    `/delivered &lt;ID&gt; - Mark order as delivered\n` +
    `/search &lt;ID&gt; - Search for an order\n` +
    `/summary - View delivery statistics\n` +
    `/help - Show this message\n\n` +
    `Use the first 8 characters of an order ID.`;
    
  await sendTelegramMessage(chatId, message, botToken);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle GET requests (browser access / health check)
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ 
      status: 'ok', 
      bot: 'YUNIX Delivery Bot',
      message: 'Webhook is active. This endpoint expects POST requests from Telegram.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const botToken = Deno.env.get('DELIVERY_BOT_TOKEN');
    if (!botToken) {
      console.error('DELIVERY_BOT_TOKEN not configured');
      return new Response(JSON.stringify({ error: 'Bot token not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for empty body
    const body = await req.text();
    if (!body) {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: 'No data received. Expecting Telegram webhook payload.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const update: TelegramUpdate = JSON.parse(body);
    console.log('Received update:', JSON.stringify(update));
    
    const message = update.message;
    if (!message?.text) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const chatId = message.chat.id;
    const text = message.text.trim();
    const username = message.from?.username;
    
    // Handle /start command (linking)
    if (text === '/start') {
      await sendTelegramMessage(
        chatId,
        '🚚 <b>YUNIX Delivery Bot</b>\n\nTo link your account, please send your staff email:\n\n<code>/link your.email@example.com</code>',
        botToken
      );
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Handle /link command
    if (text.startsWith('/link ')) {
      const email = text.replace('/link ', '').trim();
      await linkDeliveryAgent(chatId, email, username, botToken);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Check authorization for other commands
    const isAuthorized = await isAuthorizedAgent(chatId);
    if (!isAuthorized) {
      await sendTelegramMessage(
        chatId,
        '❌ You are not authorized. Please link your account first using:\n\n<code>/link your.email@example.com</code>',
        botToken
      );
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Handle commands
    const [command, ...args] = text.split(' ');
    
    switch (command.toLowerCase()) {
      case '/orders':
        await getPendingDeliveryOrders(chatId, botToken);
        break;
      case '/shipped':
        if (args.length > 0) {
          await markOrderShipped(chatId, args.join(' '), botToken);
        } else {
          await sendTelegramMessage(chatId, '❌ Please provide an order ID. Example: <code>/shipped ddd58cc9</code>', botToken);
        }
        break;
      case '/delivered':
        if (args.length > 0) {
          await markOrderDelivered(chatId, args.join(' '), botToken);
        } else {
          await sendTelegramMessage(chatId, '❌ Please provide an order ID. Example: <code>/delivered ddd58cc9</code>', botToken);
        }
        break;
      case '/search':
        if (args.length > 0) {
          await searchOrder(chatId, args.join(' '), botToken);
        } else {
          await sendTelegramMessage(chatId, '❌ Please provide an order ID. Example: <code>/search ddd58cc9</code>', botToken);
        }
        break;
      case '/summary':
        await getDeliverySummary(chatId, botToken);
        break;
      case '/help':
        await showHelp(chatId, botToken);
        break;
      default:
        await sendTelegramMessage(chatId, '❓ Unknown command. Type /help to see available commands.', botToken);
    }
    
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing webhook:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
