-- Create telegram_support_agents table for linking staff to Telegram
CREATE TABLE public.telegram_support_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  telegram_chat_id BIGINT UNIQUE,
  telegram_username TEXT,
  role TEXT NOT NULL DEFAULT 'support' CHECK (role IN ('support', 'ceo')),
  is_active BOOLEAN DEFAULT true,
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create support_group_config table for storing support group chat ID
CREATE TABLE public.support_group_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_chat_id BIGINT UNIQUE NOT NULL,
  group_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add Telegram-related columns to support_tickets
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS telegram_user_chat_id BIGINT,
ADD COLUMN IF NOT EXISTS telegram_thread_id TEXT,
ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS escalated_by UUID REFERENCES staff(id);

-- Create ticket_messages table for full conversation history
CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'support', 'ceo')),
  sender_id UUID,
  sender_name TEXT,
  message TEXT NOT NULL,
  telegram_message_id BIGINT,
  has_attachment BOOLEAN DEFAULT false,
  attachment_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_telegram_sessions for tracking user conversation state
CREATE TABLE public.user_telegram_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_chat_id BIGINT UNIQUE NOT NULL,
  telegram_username TEXT,
  current_ticket_id UUID REFERENCES support_tickets(id),
  session_state TEXT DEFAULT 'idle' CHECK (session_state IN ('idle', 'selecting_category', 'awaiting_message', 'in_conversation')),
  selected_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.telegram_support_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_group_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_telegram_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for telegram_support_agents
CREATE POLICY "CEO can manage support agents" ON public.telegram_support_agents
FOR ALL USING (is_ceo(auth.uid()));

CREATE POLICY "Staff can view support agents" ON public.telegram_support_agents
FOR SELECT USING (EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid()));

-- RLS policies for support_group_config
CREATE POLICY "CEO can manage support group config" ON public.support_group_config
FOR ALL USING (is_ceo(auth.uid()));

CREATE POLICY "Staff can view support group config" ON public.support_group_config
FOR SELECT USING (EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid()));

-- RLS policies for ticket_messages
CREATE POLICY "Staff can manage all ticket messages" ON public.ticket_messages
FOR ALL USING (is_ceo(auth.uid()) OR staff_has_permission(auth.uid(), 'manage_support'));

CREATE POLICY "Users can view messages on their tickets" ON public.ticket_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM support_tickets 
    WHERE support_tickets.id = ticket_messages.ticket_id 
    AND support_tickets.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages on their tickets" ON public.ticket_messages
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM support_tickets 
    WHERE support_tickets.id = ticket_messages.ticket_id 
    AND support_tickets.user_id = auth.uid()
  )
);

-- RLS policies for user_telegram_sessions (edge function will use service role)
CREATE POLICY "Service role only for telegram sessions" ON public.user_telegram_sessions
FOR ALL USING (false);

-- Enable realtime for ticket_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;