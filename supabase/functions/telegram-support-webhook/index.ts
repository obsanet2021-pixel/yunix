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
      username?: string;
      first_name?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
    photo?: Array<{ file_id: string }>;
    document?: { file_id: string; file_name: string };
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      username?: string;
    };
    message?: {
      chat: { id: number };
      message_id: number;
    };
    data?: string;
  };
}

// Initialize Supabase client
function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

// Generate ticket ID
function generateTicketId(): string {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `YNX-${num}`;
}

// Send Telegram message
async function sendTelegramMessage(chatId: number, text: string, botToken: string, replyMarkup?: object) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };
  if (replyMarkup) {
    body.reply_markup = JSON.stringify(replyMarkup);
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  const result = await response.json();
  console.log('📤 Telegram send result:', JSON.stringify(result));
  return result;
}

// Get Telegram file URL
async function getTelegramFileUrl(fileId: string, botToken: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    const result = await response.json();
    if (result.ok && result.result?.file_path) {
      return `https://api.telegram.org/file/bot${botToken}/${result.result.file_path}`;
    }
  } catch (error) {
    console.error('❌ Error getting file URL:', error);
  }
  return null;
}

// Forward message to support group
async function forwardMessage(fromChatId: number, messageId: number, toChatId: number, botToken: string) {
  const url = `https://api.telegram.org/bot${botToken}/forwardMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: toChatId,
      from_chat_id: fromChatId,
      message_id: messageId,
    }),
  });
  const result = await response.json();
  console.log('📤 Forward message result:', JSON.stringify(result));
  return result;
}

// Send photo to chat
async function sendPhoto(chatId: number, photoFileId: string, caption: string, botToken: string, replyMarkup?: object) {
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  const body: any = {
    chat_id: chatId,
    photo: photoFileId,
    caption,
    parse_mode: 'HTML',
  };
  if (replyMarkup) {
    body.reply_markup = JSON.stringify(replyMarkup);
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  const result = await response.json();
  console.log('📤 Photo send result:', JSON.stringify(result));
  return result;
}

// Answer callback query
async function answerCallbackQuery(callbackQueryId: string, text: string, botToken: string) {
  const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  });
}

// Category selection keyboard
const categoryKeyboard = {
  inline_keyboard: [
    [{ text: '🔐 Account & Login', callback_data: 'cat_account' }],
    [{ text: '📚 Course Access', callback_data: 'cat_course' }],
    [{ text: '📜 Certificates & Plaques', callback_data: 'cat_certificate' }],
    [{ text: '💳 Payment Issues', callback_data: 'cat_payment' }],
    [{ text: '🔧 Technical Bug', callback_data: 'cat_technical' }],
    [{ text: '❓ Other', callback_data: 'cat_other' }],
  ],
};

// Category labels
const categoryLabels: Record<string, string> = {
  cat_account: 'Account & Login',
  cat_course: 'Course Access',
  cat_certificate: 'Certificates & Plaques',
  cat_payment: 'Payment Issues',
  cat_technical: 'Technical Bug',
  cat_other: 'Other',
};

// Support action keyboard (sent to support group)
function supportActionKeyboard(ticketId: string) {
  return {
    inline_keyboard: [
      [
        { text: '💬 Reply to User', callback_data: `reply_${ticketId}` },
        { text: '🚨 Escalate to CEO', callback_data: `escalate_${ticketId}` },
      ],
      [{ text: '✅ Mark Resolved', callback_data: `resolve_${ticketId}` }],
    ],
  };
}

// CEO action keyboard
function ceoActionKeyboard(ticketId: string) {
  return {
    inline_keyboard: [
      [{ text: '💬 Reply as Management', callback_data: `ceo_reply_${ticketId}` }],
      [{ text: '✅ Mark Resolved', callback_data: `resolve_${ticketId}` }],
    ],
  };
}

// Handle /start command
async function handleStart(chatId: number, username: string | undefined, botToken: string, supabase: any) {
  console.log('🚀 Handling /start command for chat:', chatId);
  
  // Create or update user session
  await supabase
    .from('user_telegram_sessions')
    .upsert({
      telegram_chat_id: chatId,
      telegram_username: username,
      session_state: 'selecting_category',
      current_ticket_id: null,
      selected_category: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'telegram_chat_id' });

  const welcomeMessage = `🎓 <b>Welcome to YUNIX Support!</b>

I'm here to help you with any questions or issues you may have.

Please select a category for your inquiry:`;

  await sendTelegramMessage(chatId, welcomeMessage, botToken, categoryKeyboard);
}

// Handle /status command
async function handleStatus(chatId: number, botToken: string, supabase: any) {
  const { data: session } = await supabase
    .from('user_telegram_sessions')
    .select('current_ticket_id')
    .eq('telegram_chat_id', chatId)
    .maybeSingle();

  if (!session?.current_ticket_id) {
    await sendTelegramMessage(chatId, '📋 You have no active support ticket.\n\nUse /start to create a new one.', botToken);
    return;
  }

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', session.current_ticket_id)
    .maybeSingle();

  if (!ticket) {
    await sendTelegramMessage(chatId, '📋 No active ticket found.\n\nUse /start to create a new one.', botToken);
    return;
  }

  const statusEmoji = ticket.status === 'open' ? '🟢' : ticket.status === 'in_progress' ? '🟡' : '✅';
  const escalatedText = ticket.escalated ? '\n🚨 <b>Escalated to Management</b>' : '';

  await sendTelegramMessage(
    chatId,
    `📋 <b>Ticket Status</b>\n\nTicket ID: <code>${ticket.telegram_thread_id || ticket.id.slice(0, 8)}</code>\nStatus: ${statusEmoji} ${ticket.status}${escalatedText}\nCategory: ${ticket.category || 'General'}\nCreated: ${new Date(ticket.created_at).toLocaleDateString()}`,
    botToken
  );
}

// Handle /cancel command
async function handleCancel(chatId: number, botToken: string, supabase: any) {
  await supabase
    .from('user_telegram_sessions')
    .update({
      session_state: 'idle',
      selected_category: null,
      updated_at: new Date().toISOString(),
    })
    .eq('telegram_chat_id', chatId);

  await sendTelegramMessage(chatId, '❌ Cancelled.\n\nUse /start to begin a new support request.', botToken);
}

// Handle category selection
async function handleCategorySelection(chatId: number, category: string, botToken: string, supabase: any) {
  console.log('📁 Category selected:', category);

  await supabase
    .from('user_telegram_sessions')
    .update({
      session_state: 'awaiting_message',
      selected_category: category,
      updated_at: new Date().toISOString(),
    })
    .eq('telegram_chat_id', chatId);

  const categoryLabel = categoryLabels[category] || 'General';
  
  await sendTelegramMessage(
    chatId,
    `📝 <b>Category: ${categoryLabel}</b>\n\nPlease describe your issue in detail. You can also send images or documents.\n\nType /cancel to start over.`,
    botToken
  );
}

// Create new ticket and notify support
async function createTicketAndNotify(
  chatId: number,
  username: string | undefined,
  message: string,
  category: string,
  botToken: string,
  supabase: any,
  hasAttachment: boolean = false,
  attachmentUrl: string | null = null,
  photoFileId: string | null = null,
  telegramMessageId: number | null = null
) {
  console.log('🎫 Creating new ticket...');

  const ticketId = generateTicketId();
  const categoryLabel = categoryLabels[category] || 'General';

  // Create the ticket - user_id is null for Telegram users (identified by telegram_user_chat_id instead)
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert({
      subject: `[Telegram] ${categoryLabel} - ${ticketId}`,
      message: message,
      category: categoryLabel.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_'),
      status: 'open',
      priority: 'normal',
      telegram_user_chat_id: chatId,
      telegram_thread_id: ticketId,
      user_id: null, // Null for Telegram users - they're identified by telegram_user_chat_id
    })
    .select()
    .single();

  if (ticketError) {
    console.error('❌ Error creating ticket:', JSON.stringify(ticketError, null, 2));
    console.error('❌ Ticket insert payload:', { chatId, ticketId, categoryLabel, message: message.substring(0, 100) });
    await sendTelegramMessage(chatId, '❌ Sorry, there was an error creating your ticket. Please try again.', botToken);
    return;
  }

  console.log('✅ Ticket created:', ticket.id);

  // Save the initial message to ticket_messages with attachment URL
  await supabase
    .from('ticket_messages')
    .insert({
      ticket_id: ticket.id,
      sender_type: 'user',
      sender_name: username || `User ${chatId}`,
      message: message,
      has_attachment: hasAttachment,
      attachment_url: attachmentUrl,
      telegram_message_id: telegramMessageId,
    });

  // Update user session
  await supabase
    .from('user_telegram_sessions')
    .update({
      session_state: 'in_conversation',
      current_ticket_id: ticket.id,
      updated_at: new Date().toISOString(),
    })
    .eq('telegram_chat_id', chatId);

  // Confirm to user
  await sendTelegramMessage(
    chatId,
    `✅ <b>Ticket Created</b>\n\n🎫 Ticket ID: <code>${ticketId}</code>\n📁 Category: ${categoryLabel}\n📊 Status: Open\n\nA support agent will respond shortly. You can continue sending messages here and they will be added to your ticket.\n\nUse /status to check your ticket status.`,
    botToken
  );

  // Notify support group
  await notifySupportGroup(ticket, ticketId, username, message, categoryLabel, chatId, botToken, supabase, photoFileId, telegramMessageId);
}

// Notify support group about new ticket
async function notifySupportGroup(
  ticket: any,
  ticketId: string,
  username: string | undefined,
  message: string,
  category: string,
  userChatId: number,
  botToken: string,
  supabase: any,
  photoFileId: string | null = null,
  telegramMessageId: number | null = null
) {
  // Get support group config
  const { data: groupConfig } = await supabase
    .from('support_group_config')
    .select('group_chat_id')
    .eq('is_active', true)
    .maybeSingle();

  const supportNotification = `📩 <b>New Support Ticket</b>

🎫 Ticket ID: <code>${ticketId}</code>
👤 User: ${username ? `@${username}` : `ID: ${userChatId}`}
📁 Category: ${category}

<b>Message:</b>
${message.substring(0, 500)}${message.length > 500 ? '...' : ''}`;

  if (groupConfig?.group_chat_id) {
    // If there's a photo, send photo with caption first, then buttons
    if (photoFileId) {
      await sendPhoto(
        groupConfig.group_chat_id,
        photoFileId,
        supportNotification,
        botToken,
        supportActionKeyboard(ticket.id)
      );
    } else {
      await sendTelegramMessage(
        groupConfig.group_chat_id,
        supportNotification,
        botToken,
        supportActionKeyboard(ticket.id)
      );
    }
    console.log('📤 Support group notified');
  } else {
    console.log('⚠️ No support group configured');
    
    // Fallback: notify individual support agents
    const { data: agents } = await supabase
      .from('telegram_support_agents')
      .select('telegram_chat_id')
      .eq('role', 'support')
      .eq('is_active', true);

    if (agents && agents.length > 0) {
      for (const agent of agents) {
        if (photoFileId) {
          await sendPhoto(
            agent.telegram_chat_id,
            photoFileId,
            supportNotification,
            botToken,
            supportActionKeyboard(ticket.id)
          );
        } else {
          await sendTelegramMessage(
            agent.telegram_chat_id,
            supportNotification,
            botToken,
            supportActionKeyboard(ticket.id)
          );
        }
      }
      console.log(`📤 Notified ${agents.length} support agents`);
    }
  }
}

// Add message to existing ticket
async function addMessageToTicket(
  chatId: number,
  username: string | undefined,
  message: string,
  ticketId: string,
  botToken: string,
  supabase: any,
  hasAttachment: boolean = false,
  attachmentUrl: string | null = null,
  photoFileId: string | null = null,
  telegramMessageId: number | null = null
) {
  console.log('💬 Adding message to existing ticket:', ticketId);

  // Save message with attachment URL
  await supabase
    .from('ticket_messages')
    .insert({
      ticket_id: ticketId,
      sender_type: 'user',
      sender_name: username || `User ${chatId}`,
      message: message,
      has_attachment: hasAttachment,
      attachment_url: attachmentUrl,
      telegram_message_id: telegramMessageId,
    });

  // Get ticket details
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('telegram_thread_id, escalated')
    .eq('id', ticketId)
    .maybeSingle();

  // Notify support group about new message
  const { data: groupConfig } = await supabase
    .from('support_group_config')
    .select('group_chat_id')
    .eq('is_active', true)
    .maybeSingle();

  const updateNotification = `💬 <b>New Message on Ticket</b>

🎫 Ticket ID: <code>${ticket?.telegram_thread_id || ticketId.slice(0, 8)}</code>
👤 User: ${username ? `@${username}` : `ID: ${chatId}`}

<b>Message:</b>
${message.substring(0, 500)}${message.length > 500 ? '...' : ''}`;

  const keyboard = ticket?.escalated ? ceoActionKeyboard(ticketId) : supportActionKeyboard(ticketId);

  if (groupConfig?.group_chat_id) {
    if (photoFileId) {
      await sendPhoto(groupConfig.group_chat_id, photoFileId, updateNotification, botToken, keyboard);
    } else {
      await sendTelegramMessage(groupConfig.group_chat_id, updateNotification, botToken, keyboard);
    }
  }

  // If escalated, also notify CEO
  if (ticket?.escalated) {
    const { data: ceoAgent } = await supabase
      .from('telegram_support_agents')
      .select('telegram_chat_id')
      .eq('role', 'ceo')
      .eq('is_active', true)
      .maybeSingle();

    if (ceoAgent?.telegram_chat_id) {
      if (photoFileId) {
        await sendPhoto(ceoAgent.telegram_chat_id, photoFileId, `🚨 <b>Escalated Ticket Update</b>\n\n${updateNotification}`, botToken, ceoActionKeyboard(ticketId));
      } else {
        await sendTelegramMessage(ceoAgent.telegram_chat_id, `🚨 <b>Escalated Ticket Update</b>\n\n${updateNotification}`, botToken, ceoActionKeyboard(ticketId));
      }
    }
  }
}

// Handle user message (new ticket or add to existing)
async function handleUserMessage(
  chatId: number,
  username: string | undefined,
  message: string,
  botToken: string,
  supabase: any,
  hasAttachment: boolean = false,
  attachmentUrl: string | null = null,
  photoFileId: string | null = null,
  telegramMessageId: number | null = null
) {
  // Get user session
  const { data: session } = await supabase
    .from('user_telegram_sessions')
    .select('*')
    .eq('telegram_chat_id', chatId)
    .maybeSingle();

  if (!session) {
    // No session, prompt to start
    await sendTelegramMessage(
      chatId,
      '👋 Welcome to YUNIX Support!\n\nUse /start to begin a support conversation.',
      botToken
    );
    return;
  }

  if (session.session_state === 'selecting_category') {
    await sendTelegramMessage(
      chatId,
      '⬆️ Please select a category from the buttons above.\n\nOr use /cancel to start over.',
      botToken
    );
    return;
  }

  if (session.session_state === 'awaiting_message' && session.selected_category) {
    // Create new ticket
    await createTicketAndNotify(chatId, username, message, session.selected_category, botToken, supabase, hasAttachment, attachmentUrl, photoFileId, telegramMessageId);
  } else if (session.session_state === 'in_conversation' && session.current_ticket_id) {
    // Add message to existing ticket
    await addMessageToTicket(chatId, username, message, session.current_ticket_id, botToken, supabase, hasAttachment, attachmentUrl, photoFileId, telegramMessageId);
  } else {
    // Default: prompt to start
    await sendTelegramMessage(
      chatId,
      '🎫 Use /start to create a new support ticket.\n\nOr /status to check an existing one.',
      botToken
    );
  }
}

// Handle support agent reply callback
async function handleAgentReply(
  agentChatId: number,
  ticketId: string,
  callbackQueryId: string,
  botToken: string,
  supabase: any
) {
  await answerCallbackQuery(callbackQueryId, '💬 Send your reply now...', botToken);

  // Store pending reply state
  await supabase
    .from('telegram_support_agents')
    .update({ pending_reply_ticket_id: ticketId })
    .eq('telegram_chat_id', agentChatId);

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('telegram_thread_id')
    .eq('id', ticketId)
    .maybeSingle();

  await sendTelegramMessage(
    agentChatId,
    `💬 <b>Reply to Ticket ${ticket?.telegram_thread_id || ticketId.slice(0, 8)}</b>\n\nType your reply message now. It will be sent to the user.\n\nUse /cancel_reply to cancel.`,
    botToken
  );
}

// Handle escalation to CEO
async function handleEscalation(
  agentChatId: number,
  ticketId: string,
  callbackQueryId: string,
  botToken: string,
  supabase: any
) {
  await answerCallbackQuery(callbackQueryId, '🚨 Escalating to CEO...', botToken);

  // Get ticket details and conversation history
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .maybeSingle();

  if (!ticket) {
    console.error('❌ Ticket not found for escalation');
    return;
  }

  // Get conversation history
  const { data: messages } = await supabase
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  // Get agent info
  const { data: agent } = await supabase
    .from('telegram_support_agents')
    .select('*, staff:staff_id(name)')
    .eq('telegram_chat_id', agentChatId)
    .maybeSingle();

  // Update ticket as escalated
  await supabase
    .from('support_tickets')
    .update({
      escalated: true,
      escalated_at: new Date().toISOString(),
      escalated_by: agent?.staff_id,
      status: 'in_progress',
    })
    .eq('id', ticketId);

  // Build conversation history
  let historyText = '';
  if (messages && messages.length > 0) {
    historyText = '\n\n<b>Conversation History:</b>\n';
    for (const msg of messages.slice(-10)) { // Last 10 messages
      const senderLabel = msg.sender_type === 'user' ? '👤 User' : 
                          msg.sender_type === 'ceo' ? '👔 Management' : '🧑‍💼 Support';
      historyText += `\n${senderLabel}: ${msg.message.substring(0, 200)}${msg.message.length > 200 ? '...' : ''}`;
    }
  }

  // Notify CEO
  const { data: ceoAgent } = await supabase
    .from('telegram_support_agents')
    .select('telegram_chat_id')
    .eq('role', 'ceo')
    .eq('is_active', true)
    .maybeSingle();

  if (ceoAgent?.telegram_chat_id) {
    const escalationMessage = `🚨 <b>ESCALATED TICKET</b>

🎫 Ticket ID: <code>${ticket.telegram_thread_id || ticketId.slice(0, 8)}</code>
👤 User Chat ID: ${ticket.telegram_user_chat_id}
📁 Category: ${ticket.category || 'General'}
🧑‍💼 Escalated by: ${agent?.staff?.name || 'Support Agent'}
${historyText}`;

    await sendTelegramMessage(
      ceoAgent.telegram_chat_id,
      escalationMessage,
      botToken,
      ceoActionKeyboard(ticketId)
    );
    console.log('📤 CEO notified of escalation');
  } else {
    console.log('⚠️ No CEO agent configured');
  }

  // Notify user
  if (ticket.telegram_user_chat_id) {
    await sendTelegramMessage(
      ticket.telegram_user_chat_id,
      `🚨 <b>Ticket Escalated</b>\n\nYour issue has been escalated to senior management for priority handling.\n\n🎫 Ticket ID: <code>${ticket.telegram_thread_id || ticketId.slice(0, 8)}</code>\n\nYou will receive a response shortly.`,
      botToken
    );
  }

  // Confirm to support agent
  await sendTelegramMessage(
    agentChatId,
    `✅ Ticket <code>${ticket.telegram_thread_id || ticketId.slice(0, 8)}</code> has been escalated to management.`,
    botToken
  );
}

// Handle ticket resolution
async function handleResolve(
  agentChatId: number,
  ticketId: string,
  callbackQueryId: string,
  botToken: string,
  supabase: any
) {
  await answerCallbackQuery(callbackQueryId, '✅ Marking as resolved...', botToken);

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('telegram_thread_id, telegram_user_chat_id')
    .eq('id', ticketId)
    .maybeSingle();

  await supabase
    .from('support_tickets')
    .update({
      status: 'resolved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId);

  // Clear user session
  if (ticket?.telegram_user_chat_id) {
    await supabase
      .from('user_telegram_sessions')
      .update({
        session_state: 'idle',
        current_ticket_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('telegram_chat_id', ticket.telegram_user_chat_id);

    // Notify user
    await sendTelegramMessage(
      ticket.telegram_user_chat_id,
      `✅ <b>Ticket Resolved</b>\n\n🎫 Ticket ID: <code>${ticket.telegram_thread_id || ticketId.slice(0, 8)}</code>\n\nThank you for contacting YUNIX Support! If you need further assistance, use /start to open a new ticket.`,
      botToken
    );
  }

  await sendTelegramMessage(
    agentChatId,
    `✅ Ticket <code>${ticket?.telegram_thread_id || ticketId.slice(0, 8)}</code> marked as resolved.`,
    botToken
  );
}

// Handle support agent linking
async function handleLinkSupport(chatId: number, token: string, botToken: string, supabase: any) {
  console.log('🔗 Attempting to link with token:', token);
  
  // Find staff member by invite token
  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('id, name, role_id, status, invite_token, telegram_chat_id:user_id')
    .eq('invite_token', token)
    .maybeSingle();

  console.log('📋 Staff lookup result:', JSON.stringify({ staff, error: staffError }));

  if (!staff) {
    // Check if token exists but staff has different status
    const { data: anyStaff } = await supabase
      .from('staff')
      .select('id, name, status, invite_token')
      .eq('invite_token', token)
      .maybeSingle();
    
    if (anyStaff) {
      if (anyStaff.status !== 'active') {
        console.log('⚠️ Staff account not active:', anyStaff.status);
        await sendTelegramMessage(chatId, `❌ <b>Link Failed</b>\n\nYour staff account status is "${anyStaff.status}". Please contact admin to activate your account.`, botToken);
        return;
      }
    }
    
    console.log('❌ No staff found with token:', token);
    await sendTelegramMessage(chatId, '❌ <b>Invalid Link Token</b>\n\nThe token was not found or has already been used.\n\nPlease check with your administrator for a valid invite token.', botToken);
    return;
  }
  
  if (staff.status !== 'active') {
    console.log('⚠️ Staff not active:', staff.status);
    await sendTelegramMessage(chatId, `❌ <b>Account Not Active</b>\n\nYour staff account status is "${staff.status}".\n\nPlease contact admin to activate your account.`, botToken);
    return;
  }

  // Check if CEO role
  const { data: role } = await supabase
    .from('admin_roles')
    .select('name')
    .eq('id', staff.role_id)
    .maybeSingle();

  const agentRole = role?.name === 'CEO' ? 'ceo' : 'support';

  // Create or update telegram support agent
  await supabase
    .from('telegram_support_agents')
    .upsert({
      staff_id: staff.id,
      telegram_chat_id: chatId,
      role: agentRole,
      is_active: true,
      linked_at: new Date().toISOString(),
    }, { onConflict: 'telegram_chat_id' });

  await sendTelegramMessage(
    chatId,
    `✅ <b>Account Linked Successfully!</b>\n\n👤 Name: ${staff.name}\n🎭 Role: ${agentRole.toUpperCase()}\n\nYou will now receive support ticket notifications here.`,
    botToken
  );
}

// Handle support group registration
async function handleRegisterGroup(chatId: number, botToken: string, supabase: any, chatType: string) {
  if (chatType !== 'group' && chatType !== 'supergroup') {
    await sendTelegramMessage(chatId, '❌ This command can only be used in a group chat.', botToken);
    return;
  }

  await supabase
    .from('support_group_config')
    .upsert({
      group_chat_id: chatId,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'group_chat_id' });

  await sendTelegramMessage(
    chatId,
    `✅ <b>Support Group Registered!</b>\n\nThis group will now receive all new support ticket notifications.`,
    botToken
  );
}

// Process support agent message (reply to user)
async function processAgentReply(
  agentChatId: number,
  message: string,
  botToken: string,
  supabase: any,
  isCeo: boolean = false
) {
  // Get pending reply ticket
  const { data: agent } = await supabase
    .from('telegram_support_agents')
    .select('*, staff:staff_id(name), pending_reply_ticket_id')
    .eq('telegram_chat_id', agentChatId)
    .maybeSingle();

  if (!agent?.pending_reply_ticket_id) {
    return false; // No pending reply
  }

  const ticketId = agent.pending_reply_ticket_id;

  // Get ticket
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('telegram_user_chat_id, telegram_thread_id')
    .eq('id', ticketId)
    .maybeSingle();

  if (!ticket?.telegram_user_chat_id) {
    await sendTelegramMessage(agentChatId, '❌ Could not find user for this ticket.', botToken);
    return true;
  }

  // Save message
  await supabase
    .from('ticket_messages')
    .insert({
      ticket_id: ticketId,
      sender_type: isCeo ? 'ceo' : 'support',
      sender_id: agent.staff_id,
      sender_name: agent.staff?.name || 'Support',
      message: message,
    });

  // Update ticket status
  await supabase
    .from('support_tickets')
    .update({
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId);

  // Send to user
  const senderLabel = isCeo ? '👔 Yunix Management' : `🧑‍💼 Support (${agent.staff?.name || 'Agent'})`;
  await sendTelegramMessage(
    ticket.telegram_user_chat_id,
    `${senderLabel}:\n\n${message}`,
    botToken
  );

  // Clear pending reply
  await supabase
    .from('telegram_support_agents')
    .update({ pending_reply_ticket_id: null })
    .eq('telegram_chat_id', agentChatId);

  // Confirm to agent
  await sendTelegramMessage(
    agentChatId,
    `✅ Reply sent to ticket <code>${ticket.telegram_thread_id || ticketId.slice(0, 8)}</code>`,
    botToken
  );

  return true;
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const botToken = Deno.env.get('TELEGRAM_SUPPORT_BOT_TOKEN');
  if (!botToken) {
    console.error('❌ TELEGRAM_SUPPORT_BOT_TOKEN not configured');
    return new Response(JSON.stringify({ error: 'Bot token not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = getSupabaseClient();

  try {
    const body = await req.json();
    
    // Handle admin API actions
    if (body.action) {
      console.log('🔧 Admin API action:', body.action);
      
      switch (body.action) {
        case 'get_webhook_info': {
          const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
          const result = await response.json();
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        case 'setup_webhook': {
          const webhookUrl = `https://bduwtkejrfmcggfwniqe.supabase.co/functions/v1/telegram-support-webhook`;
          const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
          const result = await response.json();
          console.log('✅ Webhook setup result:', result);
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        case 'delete_webhook': {
          const response = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
          const result = await response.json();
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        case 'test_notification': {
          const { data: groupConfig } = await supabase
            .from('support_group_config')
            .select('group_chat_id')
            .eq('is_active', true)
            .maybeSingle();

          if (groupConfig?.group_chat_id) {
            await sendTelegramMessage(
              groupConfig.group_chat_id,
              '🧪 <b>Test Notification</b>\n\nThis is a test message from YUNIX Support Bot management panel.',
              botToken
            );
            return new Response(JSON.stringify({ ok: true, message: 'Test sent' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else {
            return new Response(JSON.stringify({ ok: false, error: 'No support group configured' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
        
        case 'send_reply': {
          // Web dashboard sending reply to Telegram user
          const { ticket_id, message, sender_name, is_ceo } = body;
          
          const { data: ticket } = await supabase
            .from('support_tickets')
            .select('telegram_user_chat_id, telegram_thread_id')
            .eq('id', ticket_id)
            .maybeSingle();

          if (ticket?.telegram_user_chat_id) {
            const senderLabel = is_ceo ? '👔 Yunix Management' : `🧑‍💼 Support (${sender_name || 'Agent'})`;
            await sendTelegramMessage(
              ticket.telegram_user_chat_id,
              `${senderLabel}:\n\n${message}`,
              botToken
            );
            return new Response(JSON.stringify({ ok: true }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          return new Response(JSON.stringify({ ok: false, error: 'User not found' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        default:
          return new Response(JSON.stringify({ error: 'Unknown action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
      }
    }
    
    // Handle Telegram webhook update
    const update: TelegramUpdate = body;
    console.log('📥 Received update:', JSON.stringify(update).substring(0, 500));

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const { id, from, data, message } = update.callback_query;
      const chatId = message?.chat?.id || from.id;
      
      console.log('🔘 Callback query:', data);

      if (data?.startsWith('cat_')) {
        // Category selection from user
        await handleCategorySelection(chatId, data, botToken, supabase);
      } else if (data?.startsWith('reply_')) {
        const ticketId = data.replace('reply_', '');
        await handleAgentReply(chatId, ticketId, id, botToken, supabase);
      } else if (data?.startsWith('ceo_reply_')) {
        const ticketId = data.replace('ceo_reply_', '');
        await handleAgentReply(chatId, ticketId, id, botToken, supabase);
      } else if (data?.startsWith('escalate_')) {
        const ticketId = data.replace('escalate_', '');
        await handleEscalation(chatId, ticketId, id, botToken, supabase);
      } else if (data?.startsWith('resolve_')) {
        const ticketId = data.replace('resolve_', '');
        await handleResolve(chatId, ticketId, id, botToken, supabase);
      }

      await answerCallbackQuery(id, '', botToken);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle messages
    if (update.message) {
      const { chat, text, from, photo, document } = update.message;
      const chatId = chat.id;
      const username = from?.username;
      const chatType = chat.type;

      console.log('💬 Message from chat:', chatId, 'Type:', chatType);

      // Check if this is a support agent
      const { data: agent } = await supabase
        .from('telegram_support_agents')
        .select('*, staff:staff_id(name)')
        .eq('telegram_chat_id', chatId)
        .eq('is_active', true)
        .maybeSingle();

      // Handle commands
      if (text?.startsWith('/')) {
        const [command, ...args] = text.split(' ');

        switch (command.toLowerCase()) {
          case '/start':
            if (chatType === 'private' && !agent) {
              await handleStart(chatId, username, botToken, supabase);
            } else if (agent) {
              await sendTelegramMessage(chatId, `👋 Hello ${agent.staff?.name || 'Agent'}!\n\nYou're registered as a support ${agent.role}. You'll receive ticket notifications here.`, botToken);
            }
            break;

          case '/status':
            if (!agent) {
              await handleStatus(chatId, botToken, supabase);
            }
            break;

          case '/cancel':
            if (!agent) {
              await handleCancel(chatId, botToken, supabase);
            }
            break;

          case '/cancel_reply':
            if (agent) {
              await supabase
                .from('telegram_support_agents')
                .update({ pending_reply_ticket_id: null })
                .eq('telegram_chat_id', chatId);
              await sendTelegramMessage(chatId, '❌ Reply cancelled.', botToken);
            }
            break;

          case '/link_support':
            if (args[0]) {
              await handleLinkSupport(chatId, args[0], botToken, supabase);
            } else {
              await sendTelegramMessage(chatId, '❌ Usage: /link_support <token>', botToken);
            }
            break;

          case '/register_group':
            await handleRegisterGroup(chatId, botToken, supabase, chatType);
            break;

          case '/help':
            if (agent) {
              await sendTelegramMessage(chatId, `📚 <b>Support Agent Commands</b>\n\n/cancel_reply - Cancel pending reply\n/register_group - Register this group for notifications\n\n<b>Button Actions:</b>\n• Reply to User - Send message to user\n• Escalate to CEO - Forward ticket to management\n• Mark Resolved - Close the ticket`, botToken);
            } else {
              await sendTelegramMessage(chatId, `📚 <b>YUNIX Support Help</b>\n\n/start - Create new support ticket\n/status - Check ticket status\n/cancel - Cancel current operation\n\nYou can send text messages, images, and documents to describe your issue.`, botToken);
            }
            break;

          default:
            // Unknown command
            break;
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle non-command messages
      if (agent) {
        // Check if agent has pending reply
        const replied = await processAgentReply(chatId, text || '[Media message]', botToken, supabase, agent.role === 'ceo');
        if (!replied && chatType === 'private') {
          // Agent message but no pending reply
          await sendTelegramMessage(chatId, '💡 Click "Reply to User" on a ticket to send a response.', botToken);
        }
      } else if (chatType === 'private') {
        // User message - handle photos and documents
        const hasAttachment = !!(photo || document);
        let attachmentUrl: string | null = null;
        let photoFileId: string | null = null;
        const messageId = update.message?.message_id || null;

        // Get the highest resolution photo and its URL
        if (photo && photo.length > 0) {
          photoFileId = photo[photo.length - 1].file_id;
          attachmentUrl = await getTelegramFileUrl(photoFileId, botToken);
          console.log('📷 Photo file ID:', photoFileId, 'URL:', attachmentUrl);
        } else if (document) {
          attachmentUrl = await getTelegramFileUrl(document.file_id, botToken);
          console.log('📎 Document file ID:', document.file_id, 'URL:', attachmentUrl);
        }

        const messageText = text || (photo ? '[Photo attached]' : document ? `[Document: ${document.file_name}]` : '[Attachment]');
        await handleUserMessage(chatId, username, messageText, botToken, supabase, hasAttachment, attachmentUrl, photoFileId, messageId);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error processing update:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
