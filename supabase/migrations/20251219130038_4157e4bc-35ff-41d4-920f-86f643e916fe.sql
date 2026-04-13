-- Add pending_reply_ticket_id column for tracking agent reply state
ALTER TABLE public.telegram_support_agents 
ADD COLUMN IF NOT EXISTS pending_reply_ticket_id UUID REFERENCES support_tickets(id);