
CREATE TABLE public.user_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  rule_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own strategies"
  ON public.user_strategies FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own strategies"
  ON public.user_strategies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategies"
  ON public.user_strategies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategies"
  ON public.user_strategies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
