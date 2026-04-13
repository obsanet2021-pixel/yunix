-- Create telegram_broadcasts table for storing broadcast messages
CREATE TABLE public.telegram_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'verified')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'scheduled', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  total_recipients INTEGER DEFAULT 0,
  successful_sends INTEGER DEFAULT 0,
  failed_sends INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create telegram_broadcast_logs table for audit trail
CREATE TABLE public.telegram_broadcast_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES public.telegram_broadcasts(id) ON DELETE CASCADE,
  recipient_chat_id BIGINT NOT NULL,
  recipient_email TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.telegram_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_broadcast_logs ENABLE ROW LEVEL SECURITY;

-- CEO can manage all broadcasts
CREATE POLICY "CEO can manage broadcasts"
ON public.telegram_broadcasts
FOR ALL
USING (is_ceo(auth.uid()));

-- Staff with manage_support permission can view broadcasts
CREATE POLICY "Staff can view broadcasts"
ON public.telegram_broadcasts
FOR SELECT
USING (staff_has_permission(auth.uid(), 'manage_support'));

-- CEO can view all broadcast logs
CREATE POLICY "CEO can view broadcast logs"
ON public.telegram_broadcast_logs
FOR SELECT
USING (is_ceo(auth.uid()));

-- Staff with manage_support can view broadcast logs
CREATE POLICY "Staff can view broadcast logs"
ON public.telegram_broadcast_logs
FOR SELECT
USING (staff_has_permission(auth.uid(), 'manage_support'));

-- Create trigger for updating updated_at
CREATE TRIGGER update_telegram_broadcasts_updated_at
BEFORE UPDATE ON public.telegram_broadcasts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_telegram_broadcasts_status ON public.telegram_broadcasts(status);
CREATE INDEX idx_telegram_broadcasts_created_at ON public.telegram_broadcasts(created_at DESC);
CREATE INDEX idx_telegram_broadcast_logs_broadcast_id ON public.telegram_broadcast_logs(broadcast_id);

-- Create storage bucket for broadcast images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'broadcast-images', 
  'broadcast-images', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Storage policies for broadcast images
CREATE POLICY "CEO can upload broadcast images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'broadcast-images' AND is_ceo(auth.uid()));

CREATE POLICY "CEO can update broadcast images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'broadcast-images' AND is_ceo(auth.uid()));

CREATE POLICY "CEO can delete broadcast images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'broadcast-images' AND is_ceo(auth.uid()));

CREATE POLICY "Anyone can view broadcast images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'broadcast-images');