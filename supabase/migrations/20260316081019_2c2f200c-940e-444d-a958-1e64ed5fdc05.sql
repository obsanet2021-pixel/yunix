
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prop_firm_id UUID REFERENCES public.prop_firms(id),
  amount NUMERIC,
  payout_date DATE,
  trader_name TEXT,
  firm_name TEXT,
  certificate_url TEXT NOT NULL,
  extracted_data JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payouts"
  ON public.payouts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payouts"
  ON public.payouts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payouts"
  ON public.payouts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payouts"
  ON public.payouts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Storage bucket for payout certificates
INSERT INTO storage.buckets (id, name, public)
VALUES ('payout-certificates', 'payout-certificates', true);

CREATE POLICY "Users can upload payout certificates"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payout-certificates' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view payout certificates"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'payout-certificates');

CREATE POLICY "Users can delete their payout certificates"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'payout-certificates' AND (storage.foldername(name))[1] = auth.uid()::text);
