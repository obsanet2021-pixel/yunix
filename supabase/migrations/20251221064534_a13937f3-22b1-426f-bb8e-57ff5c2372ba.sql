-- Add delivery tracking columns to plaque_orders
ALTER TABLE public.plaque_orders ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT NULL;
ALTER TABLE public.plaque_orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.plaque_orders ADD COLUMN IF NOT EXISTS shipped_by UUID;
ALTER TABLE public.plaque_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.plaque_orders ADD COLUMN IF NOT EXISTS delivered_by UUID;
ALTER TABLE public.plaque_orders ADD COLUMN IF NOT EXISTS customer_confirmed_at TIMESTAMP WITH TIME ZONE;

-- Create CEO telegram config table
CREATE TABLE IF NOT EXISTS public.ceo_telegram_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_chat_id BIGINT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on ceo_telegram_config
ALTER TABLE public.ceo_telegram_config ENABLE ROW LEVEL SECURITY;

-- CEO can manage CEO telegram config
CREATE POLICY "CEO can manage CEO telegram config" 
ON public.ceo_telegram_config 
FOR ALL 
USING (is_ceo(auth.uid()));

-- Create delivery bot agents table
CREATE TABLE IF NOT EXISTS public.delivery_bot_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  telegram_chat_id BIGINT UNIQUE,
  telegram_username TEXT,
  is_active BOOLEAN DEFAULT true,
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on delivery_bot_agents
ALTER TABLE public.delivery_bot_agents ENABLE ROW LEVEL SECURITY;

-- CEO can manage delivery bot agents
CREATE POLICY "CEO can manage delivery bot agents" 
ON public.delivery_bot_agents 
FOR ALL 
USING (is_ceo(auth.uid()));

-- Staff can view delivery bot agents
CREATE POLICY "Staff can view delivery bot agents" 
ON public.delivery_bot_agents 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.staff WHERE user_id = auth.uid()));

-- Create trigger to update updated_at
CREATE TRIGGER update_ceo_telegram_config_updated_at
  BEFORE UPDATE ON public.ceo_telegram_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_bot_agents_updated_at
  BEFORE UPDATE ON public.delivery_bot_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for plaque_orders status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.plaque_orders;