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
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    data?: string;
  };
}

// Initialize Supabase client
const getSupabaseClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
};

// Send a Telegram message
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

// Delete a message after delay (for test messages)
const deleteMessageAfterDelay = async (chatId: number, messageId: number, botToken: string, delayMs: number) => {
  setTimeout(async () => {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
        }),
      });
      console.log(`Deleted message ${messageId} from chat ${chatId}`);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }, delayMs);
};

// =====================
// NOTIFICATION TEMPLATES
// =====================

export const otpMessage = (otpCode: string, purpose: string) => {
  const purposeText = purpose === 'password_reset' ? 'Password Reset' : 
                      purpose === 'signin' ? 'Sign In' : 'Verification';
  return `
🔐 <b>YUNIX SECURITY CODE</b>

Your ${purposeText} code is:

<code>${otpCode}</code>

This code expires in <b>5 minutes</b>.
Do not share this code with anyone.

<i>⏰ This message will be deleted in 5 minutes</i>
`;
};

export const paymentApprovedMessage = (data: {
  paymentId: string;
  orderId?: string;
  invoiceId?: string;
  amount: number;
  paymentMethod: string;
  date: string;
  fullName?: string;
  phone?: string;
  shippingAddress?: string;
  deliveryMethod?: string;
  size?: string;
  quantity?: number;
}) => `
🐺 <b>YUNIX Payment Approved!</b>

✅ <b>Your payment has been verified</b>

<b>Invoice ID:</b> <code>${data.invoiceId || data.orderId || data.paymentId}</code>
<b>Order ID:</b> <code>${data.orderId || data.paymentId}</code>
<b>Amount:</b> $${data.amount.toFixed(2)}
<b>Method:</b> ${data.paymentMethod}

<b>📦 Order Details:</b>
<b>Name:</b> ${data.fullName || 'N/A'}
<b>Phone:</b> ${data.phone || 'N/A'}
<b>Size:</b> ${data.size || 'N/A'}
<b>Quantity:</b> ${data.quantity || 1}
<b>Address:</b> ${data.shippingAddress || 'N/A'}
<b>Delivery:</b> ${data.deliveryMethod || 'Standard'}

<b>Status:</b> ✅ APPROVED

Your order is now being processed for shipping! 🚚
`;

export const paymentRejectedMessage = (data: {
  paymentId: string;
  orderId?: string;
  invoiceId?: string;
  amount: number;
  paymentMethod?: string;
  reason?: string;
  fullName?: string;
  phone?: string;
  shippingAddress?: string;
  deliveryMethod?: string;
  size?: string;
  quantity?: number;
}) => `
🐺 <b>YUNIX Payment Rejected</b>

❌ <b>Your payment could not be verified</b>

<b>Invoice ID:</b> <code>${data.invoiceId || data.orderId || data.paymentId}</code>
<b>Order ID:</b> <code>${data.orderId || data.paymentId}</code>
<b>Amount:</b> $${data.amount.toFixed(2)}
<b>Method:</b> ${data.paymentMethod || 'N/A'}

<b>📦 Order Details:</b>
<b>Name:</b> ${data.fullName || 'N/A'}
<b>Phone:</b> ${data.phone || 'N/A'}
<b>Size:</b> ${data.size || 'N/A'}
<b>Quantity:</b> ${data.quantity || 1}
<b>Address:</b> ${data.shippingAddress || 'N/A'}
<b>Delivery:</b> ${data.deliveryMethod || 'Standard'}

⚠️ <b>Reason:</b> ${data.reason || 'Verification failed'}

<b>Status:</b> ❌ REJECTED

Please submit a new payment with valid proof. 🔄
`;

export const orderPlacedMessage = (data: {
  orderId: string;
  size: string;
  quantity: number;
  amount: number;
  deliveryMethod: string;
}) => `
🐺 <b>YUNIX Order Confirmed!</b>

🎉 <b>Your plaque order has been placed</b>

<b>Order ID:</b> <code>${data.orderId}</code>
<b>Size:</b> ${data.size}
<b>Quantity:</b> ${data.quantity}
<b>Total:</b> $${data.amount.toFixed(2)}
<b>Delivery:</b> ${data.deliveryMethod}

<b>Next Steps:</b>
1. Complete payment in the app
2. Upload payment proof
3. Wait for confirmation

Questions? We're here to help! 💪
`;

export const paymentSubmittedMessage = (data: {
  orderId: string;
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  fullName: string;
  phone: string;
  shippingAddress: string;
  deliveryMethod: string;
}) => `
🐺 <b>YUNIX Payment Submitted!</b>

💳 <b>Your payment is awaiting approval</b>

<b>Invoice ID:</b> <code>${data.invoiceId}</code>
<b>Order ID:</b> <code>${data.orderId}</code>
<b>Amount:</b> $${data.amount.toFixed(2)}
<b>Method:</b> ${data.paymentMethod}

<b>📦 Order Details:</b>
<b>Name:</b> ${data.fullName}
<b>Phone:</b> ${data.phone}
<b>Address:</b> ${data.shippingAddress}
<b>Delivery:</b> ${data.deliveryMethod}

<b>Status:</b> ⏳ Awaiting Approval

We'll notify you once your payment is verified! 🔔
`;

export const orderShippedMessage = (data: {
  orderId: string;
  fullName: string;
  confirmationCode: string;
}) => `
🚚 <b>YUNIX Order Shipped!</b>

🎉 <b>Your order is on its way!</b>

<b>Order ID:</b> <code>${data.orderId.slice(0, 8)}</code>
<b>Name:</b> ${data.fullName}

When you receive your order, please confirm delivery using this code:

<b>Confirmation Code:</b> <code>${data.confirmationCode}</code>

<b>To confirm delivery:</b>
Click this link or send: <code>/received ${data.confirmationCode}</code>

Thank you for your order! 🐺
`;

// =====================
// OTP HANDLING
// =====================

const handleOTPFlow = async (chatId: number, linkToken: string, username: string, botToken: string) => {
  const supabase = getSupabaseClient();
  
  console.log(`Processing OTP link token: ${linkToken}`);
  
  // Find the OTP record by link token
  const { data: otpRecord, error: findError } = await supabase
    .from('telegram_otp')
    .select('*')
    .eq('link_token', linkToken)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (findError || !otpRecord) {
    console.error('OTP not found or expired:', findError);
    return sendTelegramMessage(chatId,
      `❌ <b>Link Invalid or Expired</b>\n\nThis verification link is no longer valid.\n\nPlease request a new code from the YUNIX app.`,
      botToken
    );
  }

  // Update the OTP record with telegram_chat_id and mark as verified
  const { error: updateError } = await supabase
    .from('telegram_otp')
    .update({ 
      telegram_chat_id: chatId,
      verified: true 
    })
    .eq('id', otpRecord.id);

  if (updateError) {
    console.error('Error updating OTP record:', updateError);
    return sendTelegramMessage(chatId,
      `❌ <b>Error</b>\n\nCould not process your request. Please try again.`,
      botToken
    );
  }

  // Also link this chat to the user's profile if user exists
  if (otpRecord.user_id) {
    await supabase
      .from('profiles')
      .update({ 
        telegram_chat_id: chatId,
        telegram_linked_at: new Date().toISOString()
      })
      .eq('id', otpRecord.user_id);
  }

  // Send the OTP code
  const message = otpMessage(otpRecord.otp_code, otpRecord.purpose);
  const result = await sendTelegramMessage(chatId, message, botToken);

  // Auto-delete OTP message after 5 minutes (test mode)
  if (result.ok && result.result?.message_id) {
    deleteMessageAfterDelay(chatId, result.result.message_id, botToken, 5 * 60 * 1000);
  }

  console.log(`OTP ${otpRecord.otp_code} sent to chat ${chatId} for ${otpRecord.email}`);
  
  return result;
};

// =====================
// ACCOUNT LINKING
// =====================

const linkAccount = async (chatId: number, userId: string, username: string, botToken: string) => {
  const supabase = getSupabaseClient();
  
  // Check if user exists
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, telegram_chat_id')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return sendTelegramMessage(chatId, 
      `❌ <b>Account not found</b>\n\nThe YUNIX account could not be found. Please make sure you're logged into YUNIX and try again.`, 
      botToken
    );
  }

  // Check if already linked
  if (profile.telegram_chat_id) {
    if (profile.telegram_chat_id === chatId) {
      return sendTelegramMessage(chatId,
        `✅ <b>Already Linked!</b>\n\nYour Telegram is already connected to your YUNIX account.\n\nYou'll receive notifications for:\n• Payment approvals\n• Payment rejections\n• Order confirmations\n• Delivery updates`,
        botToken
      );
    } else {
      return sendTelegramMessage(chatId,
        `⚠️ <b>Account Already Linked</b>\n\nThis YUNIX account is linked to a different Telegram account.`,
        botToken
      );
    }
  }

  // Check if this chat_id is already linked to another account
  const { data: existingLink } = await supabase
    .from('profiles')
    .select('id')
    .eq('telegram_chat_id', chatId)
    .single();

  if (existingLink) {
    return sendTelegramMessage(chatId,
      `⚠️ <b>Telegram Already Used</b>\n\nThis Telegram account is already linked to a different YUNIX account.\n\nUse /unlink first if you want to switch accounts.`,
      botToken
    );
  }

  // Link the account
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      telegram_chat_id: chatId,
      telegram_linked_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (updateError) {
    console.error('Error linking account:', updateError);
    return sendTelegramMessage(chatId,
      `❌ <b>Link Failed</b>\n\nCould not link your account. Please try again later.`,
      botToken
    );
  }

  return sendTelegramMessage(chatId,
    `🐺 <b>YUNIX Account Linked!</b>\n\n✅ Your Telegram is now connected to your YUNIX account.\n\n<b>You'll receive notifications for:</b>\n• Payment approvals ✓\n• Payment rejections ⚠️\n• Order confirmations 📦\n• Delivery updates 🚚\n\n<b>Commands:</b>\n/received CODE - Confirm delivery\n/status - Check connection\n/unlink - Disconnect account\n\n<i>Trade Smart. Live Bold.</i>`,
    botToken
  );
};

const unlinkAccount = async (chatId: number, botToken: string) => {
  const supabase = getSupabaseClient();
  
  // Find account linked to this chat
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('telegram_chat_id', chatId)
    .single();

  if (!profile) {
    return sendTelegramMessage(chatId,
      `❌ <b>Not Linked</b>\n\nThis Telegram account is not linked to any YUNIX account.`,
      botToken
    );
  }

  // Unlink
  const { error } = await supabase
    .from('profiles')
    .update({ 
      telegram_chat_id: null,
      telegram_linked_at: null
    })
    .eq('id', profile.id);

  if (error) {
    return sendTelegramMessage(chatId,
      `❌ <b>Unlink Failed</b>\n\nCould not unlink your account. Please try again.`,
      botToken
    );
  }

  return sendTelegramMessage(chatId,
    `✅ <b>Account Unlinked</b>\n\nYour Telegram has been disconnected from YUNIX.\n\nYou will no longer receive notifications here.`,
    botToken
  );
};

// Send test notification (auto-deletes after 5 minutes)
const sendTestNotification = async (chatId: number, botToken: string) => {
  const testData = {
    paymentId: 'TEST-' + Math.random().toString(36).substring(7).toUpperCase(),
    amount: 49.99,
    paymentMethod: 'Telebirr',
    date: new Date().toLocaleDateString()
  };

  const message = `🔔 <b>TEST NOTIFICATION</b>\n\n${paymentApprovedMessage(testData)}\n\n<i>⏰ This message will be deleted in 5 minutes</i>`;
  
  const result = await sendTelegramMessage(chatId, message, botToken);
  
  if (result.ok && result.result?.message_id) {
    // Delete after 5 minutes (300000ms)
    deleteMessageAfterDelay(chatId, result.result.message_id, botToken, 5 * 60 * 1000);
  }
  
  return result;
};

// =====================
// CUSTOMER DELIVERY CONFIRMATION
// =====================

const handleDeliveryConfirmation = async (chatId: number, confirmationCode: string, botToken: string) => {
  const supabase = getSupabaseClient();
  
  console.log(`Processing delivery confirmation: ${confirmationCode}`);
  
  // Find order by confirmation code
  const { data: order, error: orderError } = await supabase
    .from('plaque_orders')
    .select('id, full_name, user_id, delivery_status, customer_confirmed_at')
    .eq('delivery_confirmation_code', confirmationCode.toUpperCase())
    .single();
    
  if (orderError || !order) {
    return sendTelegramMessage(chatId,
      `❌ <b>Invalid Code</b>\n\nNo order found with confirmation code: <code>${confirmationCode}</code>\n\nPlease check the code and try again.`,
      botToken
    );
  }
  
  // Check if already confirmed
  if (order.customer_confirmed_at) {
    return sendTelegramMessage(chatId,
      `✅ <b>Already Confirmed</b>\n\nThis order was already confirmed as received.\n\nOrder: <code>${order.id.slice(0, 8)}</code>`,
      botToken
    );
  }
  
  // Verify this telegram is linked to the order owner
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('telegram_chat_id', chatId)
    .eq('id', order.user_id)
    .single();
    
  if (!profile) {
    return sendTelegramMessage(chatId,
      `❌ <b>Unauthorized</b>\n\nThis order belongs to a different account.\n\nPlease use the Telegram linked to your YUNIX account.`,
      botToken
    );
  }
  
  // Update order with confirmation
  const { error: updateError } = await supabase
    .from('plaque_orders')
    .update({
      customer_confirmed_at: new Date().toISOString(),
      delivery_status: 'confirmed',
      status: 'Completed'
    })
    .eq('id', order.id);
    
  if (updateError) {
    console.error('Error confirming delivery:', updateError);
    return sendTelegramMessage(chatId,
      `❌ <b>Error</b>\n\nCould not confirm delivery. Please try again or contact support.`,
      botToken
    );
  }
  
  // Notify CEO about confirmation
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    await fetch(`${supabaseUrl}/functions/v1/notify-ceo-order`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        type: 'customer_confirmed',
        data: {
          orderId: order.id,
          fullName: order.full_name
        }
      })
    });
  } catch (e) {
    console.error('Error notifying CEO:', e);
  }
  
  return sendTelegramMessage(chatId,
    `✅ <b>Delivery Confirmed!</b>\n\n🎉 Thank you for confirming receipt of your order!\n\n<b>Order ID:</b> <code>${order.id.slice(0, 8)}</code>\n<b>Name:</b> ${order.full_name}\n\nWe hope you love your plaque! 🐺\n\n<i>Trade Smart. Live Bold.</i>`,
    botToken
  );
};

// =====================
// MAIN HANDLER
// =====================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle internal notification requests (from send-payment-notification)
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      
      // Check if this is an internal notification request
      if (body.internal_notification) {
        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
        if (!botToken) {
          return new Response(JSON.stringify({ error: 'Bot token not configured' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { chatId, type, data } = body;
        let message = '';

        switch (type) {
          case 'payment_approved':
            message = paymentApprovedMessage(data);
            break;
          case 'payment_rejected':
            message = paymentRejectedMessage(data);
            break;
          case 'order_placed':
            message = orderPlacedMessage(data);
            break;
          case 'payment_submitted':
            message = paymentSubmittedMessage(data);
            break;
          case 'order_shipped':
            message = orderShippedMessage(data);
            break;
          default:
            message = `🔔 ${JSON.stringify(data)}`;
        }

        const result = await sendTelegramMessage(chatId, message, botToken);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Otherwise, handle as Telegram webhook update
      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
      
      if (!botToken) {
        console.error('TELEGRAM_BOT_TOKEN not configured');
        return new Response(JSON.stringify({ error: 'Bot token not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const update: TelegramUpdate = body;
      console.log('Received Telegram update:', JSON.stringify(update, null, 2));

      // Handle incoming message
      if (update.message?.text) {
        const chatId = update.message.chat.id;
        const text = update.message.text;
        const username = update.message.from.username || update.message.from.first_name;

        console.log(`Message from ${username}: ${text}`);

        // Handle /start with deep link parameter
        if (text.startsWith('/start')) {
          const parts = text.split(' ');
          
          if (parts.length > 1) {
            const param = parts[1];
            
            // Handle OTP flow: /start otp_<TOKEN>
            if (param.startsWith('otp_')) {
              await handleOTPFlow(chatId, param, username, botToken);
            }
            // Handle account linking: /start link_<USER_ID>
            else if (param.startsWith('link_')) {
              const userId = param.replace('link_', '');
              await linkAccount(chatId, userId, username, botToken);
            }
            else {
              // Unknown parameter
              await sendTelegramMessage(chatId,
                `🐺 <b>Welcome to YUNIX, ${username}!</b>\n\nI'm your trading assistant bot. Connect your YUNIX account to receive instant notifications!\n\n<b>Commands:</b>\n/link - Link your YUNIX account\n/unlink - Disconnect your account\n/status - Check connection status\n/test - Send a test notification\n/received CODE - Confirm delivery\n/help - Show all commands\n\n<i>Trade Smart. Live Bold.</i>`,
                botToken
              );
            }
          } else {
            // Regular /start
            await sendTelegramMessage(chatId,
              `🐺 <b>Welcome to YUNIX, ${username}!</b>\n\nI'm your trading assistant bot. Connect your YUNIX account to receive instant notifications!\n\n<b>Commands:</b>\n/link - Link your YUNIX account\n/unlink - Disconnect your account\n/status - Check connection status\n/test - Send a test notification\n/received CODE - Confirm delivery\n/help - Show all commands\n\n<i>Trade Smart. Live Bold.</i>`,
              botToken
            );
          }
        } else if (text === '/help') {
          await sendTelegramMessage(chatId,
            `🐺 <b>YUNIX Bot Commands</b>\n\n/start - Start the bot\n/link - Link your YUNIX account (use from app)\n/unlink - Disconnect your account\n/status - Check connection status\n/test - Send a test notification (5 min)\n/received CODE - Confirm order delivery\n/help - Show this help message\n\n<b>How to connect:</b>\nUse "Verify via Telegram" on the YUNIX sign-in page to link your account and receive OTP codes.\n\n<b>To confirm delivery:</b>\nWhen your order is delivered, use the confirmation code sent to you.\n\n<i>Trade Smart. Live Bold.</i>`,
            botToken
          );
        } else if (text === '/status') {
          const supabase = getSupabaseClient();
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, name, email, telegram_linked_at')
            .eq('telegram_chat_id', chatId)
            .single();

          if (profile) {
            await sendTelegramMessage(chatId,
              `✅ <b>Account Connected</b>\n\n<b>Name:</b> ${profile.name || 'Not set'}\n<b>Email:</b> ${profile.email || 'Not set'}\n<b>Linked:</b> ${profile.telegram_linked_at ? new Date(profile.telegram_linked_at).toLocaleString() : 'Unknown'}\n\n<b>Notifications enabled:</b>\n• Payment approvals ✓\n• Payment rejections ✓\n• Order confirmations ✓\n• Delivery updates ✓\n• OTP codes ✓`,
              botToken
            );
          } else {
            await sendTelegramMessage(chatId,
              `❌ <b>Not Connected</b>\n\nYour Telegram is not linked to a YUNIX account.\n\nUse "Verify via Telegram" on the YUNIX app to link your account.`,
              botToken
            );
          }
        } else if (text === '/unlink') {
          await unlinkAccount(chatId, botToken);
        } else if (text === '/test') {
          await sendTestNotification(chatId, botToken);
        } else if (text.startsWith('/received')) {
          const parts = text.split(' ');
          if (parts.length > 1) {
            await handleDeliveryConfirmation(chatId, parts[1], botToken);
          } else {
            await sendTelegramMessage(chatId,
              `📦 <b>Confirm Delivery</b>\n\nTo confirm you received your order, use:\n\n<code>/received YOUR_CODE</code>\n\nExample: <code>/received ABC123</code>\n\nYou'll find the confirmation code in your delivery notification.`,
              botToken
            );
          }
        } else {
          await sendTelegramMessage(chatId,
            `Received: ${text}\n\nUse /help to see available commands.`,
            botToken
          );
        }
      }

      // Handle callback queries (button clicks)
      if (update.callback_query) {
        console.log('Callback query:', update.callback_query.data);
        // Handle button callbacks here if needed
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Error processing request:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
