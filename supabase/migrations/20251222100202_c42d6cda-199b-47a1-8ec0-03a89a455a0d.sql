-- Add group_chat_id to CEO telegram config for private group notifications
ALTER TABLE public.ceo_telegram_config 
ADD COLUMN IF NOT EXISTS group_chat_id bigint,
ADD COLUMN IF NOT EXISTS auto_notify_new_orders boolean DEFAULT true;

-- Create staff_reminders table for COO reminder system
CREATE TABLE IF NOT EXISTS public.staff_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by uuid NOT NULL,
  assigned_to uuid NOT NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'pending',
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  completed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on staff_reminders
ALTER TABLE public.staff_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies for staff_reminders
CREATE POLICY "CEO and COO can manage all reminders" 
ON public.staff_reminders 
FOR ALL 
USING (is_ceo(auth.uid()) OR staff_has_permission(auth.uid(), 'manage_users'));

CREATE POLICY "Staff can view their assigned reminders" 
ON public.staff_reminders 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.user_id = auth.uid() 
    AND staff.id = staff_reminders.assigned_to
  )
);

CREATE POLICY "Staff can update their assigned reminders" 
ON public.staff_reminders 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.staff 
    WHERE staff.user_id = auth.uid() 
    AND staff.id = staff_reminders.assigned_to
  )
);

-- Add delivery_confirmation_code to plaque_orders for customer confirmation
ALTER TABLE public.plaque_orders 
ADD COLUMN IF NOT EXISTS delivery_confirmation_code text,
ADD COLUMN IF NOT EXISTS customer_confirmation_requested_at timestamp with time zone;

-- Create trigger to update updated_at on staff_reminders
CREATE TRIGGER update_staff_reminders_updated_at
BEFORE UPDATE ON public.staff_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for staff_reminders
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_reminders;