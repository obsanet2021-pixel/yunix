-- Add attachment_url column to ticket_messages for storing Telegram image URLs
ALTER TABLE public.ticket_messages ADD COLUMN IF NOT EXISTS attachment_url text;

-- Add support_templates table for pre-written response templates
CREATE TABLE IF NOT EXISTS public.support_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'general',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for support_templates
CREATE POLICY "Staff can view templates" ON public.support_templates
  FOR SELECT USING (
    is_ceo(auth.uid()) OR 
    staff_has_permission(auth.uid(), 'manage_support')
  );

CREATE POLICY "CEO can manage templates" ON public.support_templates
  FOR ALL USING (is_ceo(auth.uid()));

-- Insert default templates
INSERT INTO public.support_templates (title, content, category) VALUES
  ('Greeting', 'Hi! This is {agent_name}, your support assistant for today. How can I help you?', 'greeting'),
  ('AI Escalation', 'Thank you for reaching out. I''ve reviewed your conversation with our AI assistant and I''m here to help resolve your issue. Could you please provide more details?', 'escalation'),
  ('Checking Account', 'I understand you''re experiencing issues. Let me check your account details and get back to you shortly.', 'general'),
  ('Payment Investigation', 'I understand you''re experiencing payment issues. Let me investigate this for you. Could you please confirm the payment date and amount?', 'payment'),
  ('Technical Support', 'I''m sorry to hear you''re experiencing technical difficulties. Let me help you troubleshoot this. Could you please describe what you see on your screen?', 'technical'),
  ('Closing', 'Is there anything else I can help you with today? If not, I''ll close this ticket. Feel free to reach out anytime you need assistance!', 'closing'),
  ('Follow Up', 'I''m following up on your previous inquiry. Has the issue been resolved? Please let me know if you need any further assistance.', 'follow_up');