-- Fix function search path
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER update_prop_firms_updated_at
  BEFORE UPDATE ON public.prop_firms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_certificates_updated_at
  BEFORE UPDATE ON public.certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Drop and recreate RLS policies for prop_firms to only allow authenticated users
DROP POLICY IF EXISTS "Users can view their own prop firms" ON public.prop_firms;
DROP POLICY IF EXISTS "Users can create their own prop firms" ON public.prop_firms;
DROP POLICY IF EXISTS "Users can update their own prop firms" ON public.prop_firms;
DROP POLICY IF EXISTS "Users can delete their own prop firms" ON public.prop_firms;

CREATE POLICY "Authenticated users can view their own prop firms"
  ON public.prop_firms FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create their own prop firms"
  ON public.prop_firms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own prop firms"
  ON public.prop_firms FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own prop firms"
  ON public.prop_firms FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Drop and recreate RLS policies for certificates to only allow authenticated users
DROP POLICY IF EXISTS "Users can view their own certificates" ON public.certificates;
DROP POLICY IF EXISTS "Users can create their own certificates" ON public.certificates;
DROP POLICY IF EXISTS "Users can update their own certificates" ON public.certificates;
DROP POLICY IF EXISTS "Users can delete their own certificates" ON public.certificates;

CREATE POLICY "Authenticated users can view their own certificates"
  ON public.certificates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create their own certificates"
  ON public.certificates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own certificates"
  ON public.certificates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own certificates"
  ON public.certificates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Drop and recreate storage policies for prop-firm-screenshots to only allow authenticated users
DROP POLICY IF EXISTS "Users can upload their own screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own screenshots" ON storage.objects;

CREATE POLICY "Authenticated users can upload their own screenshots"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'prop-firm-screenshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Authenticated users can view their own screenshots"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'prop-firm-screenshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Authenticated users can update their own screenshots"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'prop-firm-screenshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Authenticated users can delete their own screenshots"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'prop-firm-screenshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Drop and recreate storage policies for certificates to only allow authenticated users
DROP POLICY IF EXISTS "Users can upload their own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own certificates" ON storage.objects;

CREATE POLICY "Authenticated users can upload their own certificates"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'certificates' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Authenticated users can view their own certificates"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'certificates' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Authenticated users can update their own certificates"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'certificates' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Authenticated users can delete their own certificates"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'certificates' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );