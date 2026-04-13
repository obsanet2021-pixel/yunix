import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
}

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

// Check if chat is linked to CEO
const isCEOChat = async (chatId: number) => {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('ceo_telegram_config')
    .select('id')
    .eq('telegram_chat_id', chatId)
    .eq('is_active', true)
    .single();
  return !!data;
};

// Link CEO account
const linkCEOAccount = async (chatId: number, linkCode: string, botToken: string) => {
  const supabase = getSupabaseClient();
  
  // Check if code matches expected pattern (simple validation)
  if (linkCode !== 'YUNIX-CEO-2024') {
    return sendTelegramMessage(chatId, 
      `❌ <b>Invalid Link Code</b>\n\nThe code provided is incorrect.`, 
      botToken
    );
  }

  // Check if already linked
  const { data: existing } = await supabase
    .from('ceo_telegram_config')
    .select('id')
    .eq('telegram_chat_id', chatId)
    .single();

  if (existing) {
    return sendTelegramMessage(chatId,
      `✅ <b>Already Connected</b>\n\nThis Telegram is already linked to the CEO dashboard.`,
      botToken
    );
  }

  // Deactivate any previous config
  await supabase
    .from('ceo_telegram_config')
    .update({ is_active: false })
    .eq('is_active', true);

  // Create new config
  const { error } = await supabase
    .from('ceo_telegram_config')
    .insert({ telegram_chat_id: chatId, is_active: true, auto_notify_new_orders: true });

  if (error) {
    console.error('Error linking CEO:', error);
    return sendTelegramMessage(chatId,
      `❌ <b>Link Failed</b>\n\nCould not link account. Please try again.`,
      botToken
    );
  }

  return sendTelegramMessage(chatId,
    `🐺 <b>YUNIX CEO Bot Connected!</b>\n\n✅ You now have access to order summaries.\n\n<b>Available Commands:</b>\n/orders - View pending orders\n/today - Today's order summary\n/stats - Overall statistics\n/revenue - Revenue overview\n/search &lt;ID&gt; - Search order by ID\n/help - Show all commands\n\n🔔 Auto-notifications for new orders are enabled.`,
    botToken
  );
};

// Get pending orders summary
const getPendingOrders = async (chatId: number, botToken: string) => {
  const supabase = getSupabaseClient();
  const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || '';
  
  const { data: orders, error } = await supabase
    .from('plaque_orders')
    .select(`
      id, full_name, size, quantity, price, status, payment_status, delivery_status,
      created_at, delivery_method
    `)
    .in('status', ['Pending', 'Processing'])
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching orders:', error);
    return sendTelegramMessage(chatId, `❌ Error fetching orders`, botToken);
  }

  if (!orders || orders.length === 0) {
    return sendTelegramMessage(chatId,
      `📦 <b>Pending Orders</b>\n\nNo pending orders at the moment.`,
      botToken
    );
  }

  let message = `📦 <b>Pending Orders (${orders.length})</b>\n\n`;
  
  orders.forEach((order, index) => {
    const statusEmoji = order.payment_status === 'paid' ? '✅' : '⏳';
    const shortId = order.id.slice(0, 8);
    message += `${index + 1}. <b>${order.full_name}</b>\n`;
    message += `   ID: <code>${shortId}</code>\n`;
    message += `   Size: ${order.size} | Qty: ${order.quantity}\n`;
    message += `   Price: $${(order.price || 0).toFixed(2)} ${statusEmoji}\n`;
    message += `   Status: ${order.status} | ${order.payment_status}\n`;
    if (order.delivery_status) {
      message += `   Delivery: ${order.delivery_status}\n`;
    }
    message += `\n`;
  });

  message += `\n💡 Use <code>/search ID</code> to view order details`;

  return sendTelegramMessage(chatId, message, botToken);
};

// Search order by ID
const searchOrder = async (chatId: number, searchTerm: string, botToken: string) => {
  const supabase = getSupabaseClient();
  
  const key = searchTerm.trim().toLowerCase();
  
  if (!key || key.length < 3) {
    return sendTelegramMessage(chatId, 
      `❌ Please provide at least 3 characters of the order ID.\n\nExample: <code>/search abc123</code>`,
      botToken
    );
  }

  // Fetch recent orders and match by prefix
  const { data: candidates, error } = await supabase
    .from('plaque_orders')
    .select(`
      id, full_name, phone, shipping_address, size, quantity, price, 
      status, payment_status, delivery_status, delivery_method,
      created_at, invoice_id, ceo_action, ceo_action_reason
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error searching orders:', error);
    return sendTelegramMessage(chatId, `❌ Error searching orders`, botToken);
  }

  const order = candidates?.find(o => 
    o.id.toLowerCase().startsWith(key) || 
    o.id.toLowerCase().includes(key) ||
    (o.invoice_id && o.invoice_id.toLowerCase().includes(key))
  );

  if (!order) {
    return sendTelegramMessage(chatId,
      `🔍 <b>Order Not Found</b>\n\nNo order matching "<code>${searchTerm}</code>"\n\nTry using the first 8 characters of the order ID.`,
      botToken
    );
  }

  const statusEmoji = 
    order.status === 'Delivered' ? '✅' :
    order.status === 'Processing' ? '🔄' :
    order.status === 'Pending' ? '⏳' :
    order.status === 'Rejected' ? '❌' : '📦';

  const paymentEmoji = order.payment_status === 'paid' ? '✅' : '⏳';
  const deliveryEmoji = 
    order.delivery_status === 'delivered' ? '✅' :
    order.delivery_status === 'shipped' ? '🚚' : '📦';

  let message = `🔍 <b>Order Details</b>\n\n`;
  message += `📋 <b>Order ID:</b> <code>${order.id.slice(0, 8)}</code>\n`;
  if (order.invoice_id) {
    message += `🧾 <b>Invoice:</b> <code>${order.invoice_id}</code>\n`;
  }
  message += `\n<b>👤 Customer Info:</b>\n`;
  message += `• Name: ${order.full_name}\n`;
  message += `• Phone: ${order.phone}\n`;
  message += `• Address: ${order.shipping_address.substring(0, 60)}${order.shipping_address.length > 60 ? '...' : ''}\n`;
  message += `\n<b>📦 Order Info:</b>\n`;
  message += `• Size: ${order.size}\n`;
  message += `• Quantity: ${order.quantity}\n`;
  message += `• Price: $${(order.price || 0).toFixed(2)}\n`;
  message += `• Delivery: ${order.delivery_method}\n`;
  message += `\n<b>📊 Status:</b>\n`;
  message += `• Order: ${statusEmoji} ${order.status}\n`;
  message += `• Payment: ${paymentEmoji} ${order.payment_status || 'unpaid'}\n`;
  message += `• Delivery: ${deliveryEmoji} ${order.delivery_status || 'pending'}\n`;
  
  if (order.ceo_action) {
    message += `\n<b>👔 CEO Action:</b> ${order.ceo_action}`;
    if (order.ceo_action_reason) {
      message += `\nReason: ${order.ceo_action_reason}`;
    }
  }

  message += `\n\n📅 Created: ${new Date(order.created_at).toLocaleString()}`;

  return sendTelegramMessage(chatId, message, botToken);
};

// Get today's orders
const getTodayOrders = async (chatId: number, botToken: string) => {
  const supabase = getSupabaseClient();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data: orders, error } = await supabase
    .from('plaque_orders')
    .select('id, full_name, size, quantity, price, status, payment_status, created_at')
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching today orders:', error);
    return sendTelegramMessage(chatId, `❌ Error fetching orders`, botToken);
  }

  const totalOrders = orders?.length || 0;
  const totalRevenue = orders?.reduce((sum, o) => sum + (o.price || 0), 0) || 0;
  const paidOrders = orders?.filter(o => o.payment_status === 'paid').length || 0;

  let message = `📅 <b>Today's Orders</b>\n\n`;
  message += `📊 <b>Summary:</b>\n`;
  message += `• Total Orders: ${totalOrders}\n`;
  message += `• Paid Orders: ${paidOrders}\n`;
  message += `• Pending Payment: ${totalOrders - paidOrders}\n`;
  message += `• Total Revenue: $${totalRevenue.toFixed(2)}\n\n`;

  if (orders && orders.length > 0) {
    message += `<b>Recent Orders:</b>\n`;
    orders.slice(0, 5).forEach((order, index) => {
      const statusEmoji = order.payment_status === 'paid' ? '✅' : '⏳';
      message += `${index + 1}. ${order.full_name} - ${order.size} - $${(order.price || 0).toFixed(2)} ${statusEmoji}\n`;
      message += `   ID: <code>${order.id.slice(0, 8)}</code>\n`;
    });
  }

  return sendTelegramMessage(chatId, message, botToken);
};

// Get overall statistics
const getStats = async (chatId: number, botToken: string) => {
  const supabase = getSupabaseClient();

  // Total orders
  const { count: totalOrders } = await supabase
    .from('plaque_orders')
    .select('*', { count: 'exact', head: true });

  // Orders by status
  const { data: statusData } = await supabase
    .from('plaque_orders')
    .select('status');

  const statusCounts: Record<string, number> = {};
  statusData?.forEach(o => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });

  // Payment stats
  const { data: paymentData } = await supabase
    .from('plaque_orders')
    .select('payment_status, price');

  const paidOrders = paymentData?.filter(o => o.payment_status === 'paid') || [];
  const unpaidOrders = paymentData?.filter(o => o.payment_status !== 'paid') || [];
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.price || 0), 0);
  const pendingRevenue = unpaidOrders.reduce((sum, o) => sum + (o.price || 0), 0);

  // Delivery stats
  const { data: deliveryData } = await supabase
    .from('plaque_orders')
    .select('delivery_status')
    .not('delivery_status', 'is', null);

  const deliveryCounts: Record<string, number> = {};
  deliveryData?.forEach(o => {
    if (o.delivery_status) {
      deliveryCounts[o.delivery_status] = (deliveryCounts[o.delivery_status] || 0) + 1;
    }
  });

  let message = `📊 <b>YUNIX Order Statistics</b>\n\n`;
  message += `<b>📦 Total Orders:</b> ${totalOrders || 0}\n\n`;
  
  message += `<b>Order Status:</b>\n`;
  Object.entries(statusCounts).forEach(([status, count]) => {
    message += `• ${status}: ${count}\n`;
  });
  
  message += `\n<b>💰 Revenue:</b>\n`;
  message += `• Collected: $${totalRevenue.toFixed(2)}\n`;
  message += `• Pending: $${pendingRevenue.toFixed(2)}\n`;
  message += `• Paid Orders: ${paidOrders.length}\n`;
  message += `• Unpaid Orders: ${unpaidOrders.length}\n`;

  if (Object.keys(deliveryCounts).length > 0) {
    message += `\n<b>🚚 Delivery Status:</b>\n`;
    Object.entries(deliveryCounts).forEach(([status, count]) => {
      message += `• ${status}: ${count}\n`;
    });
  }

  return sendTelegramMessage(chatId, message, botToken);
};

// Get revenue overview
const getRevenue = async (chatId: number, botToken: string) => {
  const supabase = getSupabaseClient();

  // This week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const { data: weekOrders } = await supabase
    .from('plaque_orders')
    .select('price, payment_status')
    .gte('created_at', weekStart.toISOString());

  const weekRevenue = weekOrders?.filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + (o.price || 0), 0) || 0;
  const weekPending = weekOrders?.filter(o => o.payment_status !== 'paid')
    .reduce((sum, o) => sum + (o.price || 0), 0) || 0;

  // This month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: monthOrders } = await supabase
    .from('plaque_orders')
    .select('price, payment_status')
    .gte('created_at', monthStart.toISOString());

  const monthRevenue = monthOrders?.filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + (o.price || 0), 0) || 0;
  const monthPending = monthOrders?.filter(o => o.payment_status !== 'paid')
    .reduce((sum, o) => sum + (o.price || 0), 0) || 0;

  // All time
  const { data: allOrders } = await supabase
    .from('plaque_orders')
    .select('price, payment_status');

  const totalRevenue = allOrders?.filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + (o.price || 0), 0) || 0;

  let message = `💰 <b>Revenue Overview</b>\n\n`;
  
  message += `<b>📅 This Week:</b>\n`;
  message += `• Collected: $${weekRevenue.toFixed(2)}\n`;
  message += `• Pending: $${weekPending.toFixed(2)}\n`;
  message += `• Orders: ${weekOrders?.length || 0}\n\n`;

  message += `<b>📆 This Month:</b>\n`;
  message += `• Collected: $${monthRevenue.toFixed(2)}\n`;
  message += `• Pending: $${monthPending.toFixed(2)}\n`;
  message += `• Orders: ${monthOrders?.length || 0}\n\n`;

  message += `<b>🏆 All Time:</b>\n`;
  message += `• Total Revenue: $${totalRevenue.toFixed(2)}\n`;
  message += `• Total Orders: ${allOrders?.length || 0}\n`;

  return sendTelegramMessage(chatId, message, botToken);
};

// Show help
const showHelp = (chatId: number, botToken: string) => {
  const message = `🐺 <b>YUNIX CEO Bot</b>\n\n<b>Available Commands:</b>\n\n/orders - View pending orders (max 10)\n/today - Today's order summary\n/stats - Overall statistics\n/revenue - Revenue overview\n/search &lt;ID&gt; - Search order by ID\n/help - Show this help message\n\n<i>🔔 Auto-notifications are enabled for new orders</i>\n<i>📊 Read-only access to order data</i>`;
  return sendTelegramMessage(chatId, message, botToken);
};

// Handle internal notification requests (for auto-notifications)
const handleInternalNotification = async (body: any, botToken: string) => {
  const supabase = getSupabaseClient();
  
  // Get CEO config
  const { data: config } = await supabase
    .from('ceo_telegram_config')
    .select('telegram_chat_id, group_chat_id, auto_notify_new_orders')
    .eq('is_active', true)
    .single();
    
  if (!config) {
    console.log('No active CEO config found');
    return { ok: false, error: 'No CEO configured' };
  }

  const { type, data } = body;
  let message = '';
  
  switch (type) {
    case 'new_order':
      if (!config.auto_notify_new_orders) {
        return { ok: true, message: 'Auto-notify disabled' };
      }
      message = `🆕 <b>New Order Received!</b>\n\n` +
        `📋 <b>Order ID:</b> <code>${data.orderId?.slice(0, 8) || 'N/A'}</code>\n` +
        `👤 <b>Customer:</b> ${data.fullName || 'N/A'}\n` +
        `📐 <b>Size:</b> ${data.size || 'N/A'}\n` +
        `💰 <b>Price:</b> $${(data.price || 0).toFixed(2)}\n` +
        `🚚 <b>Delivery:</b> ${data.deliveryMethod || 'Standard'}\n` +
        `📍 <b>Address:</b> ${(data.shippingAddress || '').substring(0, 50)}...\n\n` +
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
      
    case 'order_status_change':
      const emoji = data.newStatus === 'Delivered' ? '✅' : 
                    data.newStatus === 'Shipped' ? '🚚' :
                    data.newStatus === 'Rejected' ? '❌' : '📦';
      message = `${emoji} <b>Order Status Updated</b>\n\n` +
        `📋 <b>Order ID:</b> <code>${data.orderId?.slice(0, 8) || 'N/A'}</code>\n` +
        `👤 <b>Customer:</b> ${data.fullName || 'N/A'}\n` +
        `📊 <b>New Status:</b> ${data.newStatus}\n` +
        `📊 <b>Previous:</b> ${data.previousStatus || 'N/A'}`;
      break;
      
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
  
  // Also send to group if configured
  if (config.group_chat_id) {
    await sendTelegramMessage(config.group_chat_id, message, botToken);
  }
  
  return result;
};

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle GET requests (browser access / health check)
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ 
      status: 'ok', 
      bot: 'YUNIX CEO Bot',
      message: 'Webhook is active. This endpoint expects POST requests from Telegram.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const botToken = Deno.env.get('CEO_BOT_TOKEN');
  
  if (!botToken) {
    console.error('CEO_BOT_TOKEN not configured');
    return new Response(JSON.stringify({ error: 'Bot token not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
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
    
    const parsedBody = JSON.parse(body);
    
    // Check if this is an internal notification request
    if (parsedBody.internal_notification) {
      const result = await handleInternalNotification(parsedBody, botToken);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const update: TelegramUpdate = parsedBody;
    console.log('CEO Bot received update:', JSON.stringify(update, null, 2));

    if (!update.message?.text) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();

    // Handle /start with link code
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      if (parts.length > 1) {
        await linkCEOAccount(chatId, parts[1], botToken);
      } else {
        // Check if already linked
        if (await isCEOChat(chatId)) {
          await showHelp(chatId, botToken);
        } else {
          await sendTelegramMessage(chatId,
            `🐺 <b>YUNIX CEO Bot</b>\n\nTo link this bot, use the link code from your CEO dashboard.\n\nFormat: /start YUNIX-CEO-2024`,
            botToken
          );
        }
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check authorization for other commands
    if (!await isCEOChat(chatId)) {
      await sendTelegramMessage(chatId,
        `❌ <b>Unauthorized</b>\n\nThis bot is only for authorized CEO access.\n\nUse /start LINK_CODE to connect.`,
        botToken
      );
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse command and arguments - strip @botname from commands (for group chats)
    const parts = text.split(' ');
    const command = parts[0].split('@')[0].toLowerCase(); // Remove @botname suffix
    const args = parts.slice(1);

    // Handle commands
    switch (command) {
      case '/orders':
        await getPendingOrders(chatId, botToken);
        break;
      case '/today':
        await getTodayOrders(chatId, botToken);
        break;
      case '/stats':
        await getStats(chatId, botToken);
        break;
      case '/revenue':
        await getRevenue(chatId, botToken);
        break;
      case '/search':
        if (args.length > 0) {
          await searchOrder(chatId, args.join(' '), botToken);
        } else {
          await sendTelegramMessage(chatId,
            `🔍 <b>Search Order</b>\n\nUsage: <code>/search ORDER_ID</code>\n\nExample: <code>/search abc123</code>`,
            botToken
          );
        }
        break;
      case '/help':
        await showHelp(chatId, botToken);
        break;
      default:
        await sendTelegramMessage(chatId,
          `❓ Unknown command. Use /help to see available commands.`,
          botToken
        );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('CEO Bot error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
