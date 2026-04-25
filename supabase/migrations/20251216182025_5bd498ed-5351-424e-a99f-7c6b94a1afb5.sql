-- Add Plaque Order Manager role to admin_roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles WHERE name = 'Plaque Order Manager'
  ) THEN
    INSERT INTO public.admin_roles (name, description, permissions)
    VALUES (
      'Plaque Order Manager',
      'Manages plaque orders, shipping status, and order fulfillment',
      '{
        "manage_users": false,
        "manage_roles": false,
        "manage_finance": false,
        "manage_courses": false,
        "manage_analytics": false,
        "manage_settings": false,
        "manage_support": false,
        "view_dashboard": true,
        "view_invoices": true,
        "view_reports": false,
        "manage_plaque_orders": true
      }'::jsonb
    );
  END IF;
END
$$;

-- Create support_tickets table for user enquiries
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support_messages table for ticket conversations
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_staff_reply BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Enable RLS on support_messages
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Users can view their own tickets" 
ON public.support_tickets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets" 
ON public.support_tickets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets" 
ON public.support_tickets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all tickets" 
ON public.support_tickets 
FOR SELECT 
USING (
  is_ceo(auth.uid()) OR 
  staff_has_permission(auth.uid(), 'manage_support')
);

CREATE POLICY "Staff can update all tickets" 
ON public.support_tickets 
FOR UPDATE 
USING (
  is_ceo(auth.uid()) OR 
  staff_has_permission(auth.uid(), 'manage_support')
);

-- RLS Policies for support_messages
CREATE POLICY "Users can view messages on their tickets" 
ON public.support_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE support_tickets.id = support_messages.ticket_id 
    AND support_tickets.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages on their tickets" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE support_tickets.id = support_messages.ticket_id 
    AND support_tickets.user_id = auth.uid()
  )
);

CREATE POLICY "Staff can view all messages" 
ON public.support_messages 
FOR SELECT 
USING (
  is_ceo(auth.uid()) OR 
  staff_has_permission(auth.uid(), 'manage_support')
);

CREATE POLICY "Staff can create messages" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (
  is_ceo(auth.uid()) OR 
  staff_has_permission(auth.uid(), 'manage_support')
);

-- Create trigger for updated_at on support_tickets
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for support_messages (live chat)
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;