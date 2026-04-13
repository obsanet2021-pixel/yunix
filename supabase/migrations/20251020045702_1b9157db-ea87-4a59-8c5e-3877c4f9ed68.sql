-- Create storage buckets for prop firm screenshots and certificates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('prop-firm-screenshots', 'prop-firm-screenshots', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('certificates', 'certificates', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

-- Create prop_firms table
CREATE TABLE public.prop_firms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_number TEXT,
  balance DECIMAL(12, 2),
  equity DECIMAL(12, 2),
  profit_target DECIMAL(12, 2),
  current_profit DECIMAL(12, 2) DEFAULT 0,
  consistency_percentage DECIMAL(5, 2),
  dashboard_screenshot_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create certificates table
CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  prop_firm_id UUID REFERENCES public.prop_firms(id) ON DELETE SET NULL,
  issued_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prop_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prop_firms
CREATE POLICY "Users can view their own prop firms"
  ON public.prop_firms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own prop firms"
  ON public.prop_firms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prop firms"
  ON public.prop_firms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prop firms"
  ON public.prop_firms FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for certificates
CREATE POLICY "Users can view their own certificates"
  ON public.certificates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own certificates"
  ON public.certificates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own certificates"
  ON public.certificates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own certificates"
  ON public.certificates FOR DELETE
  USING (auth.uid() = user_id);

-- Storage policies for prop-firm-screenshots
CREATE POLICY "Users can upload their own screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'prop-firm-screenshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own screenshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'prop-firm-screenshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own screenshots"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'prop-firm-screenshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own screenshots"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'prop-firm-screenshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for certificates
CREATE POLICY "Users can upload their own certificates"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'certificates' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own certificates"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'certificates' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own certificates"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'certificates' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own certificates"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'certificates' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_prop_firms_updated_at
  BEFORE UPDATE ON public.prop_firms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_certificates_updated_at
  BEFORE UPDATE ON public.certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();