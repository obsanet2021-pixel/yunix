-- Create trades table
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prop_firm_id UUID REFERENCES public.prop_firms(id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  profit NUMERIC NOT NULL,
  session TEXT,
  emotion TEXT,
  notes TEXT,
  trade_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create policies for trades
CREATE POLICY "Users can view their own trades"
ON public.trades
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trades"
ON public.trades
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades"
ON public.trades
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trades"
ON public.trades
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_trades_updated_at
BEFORE UPDATE ON public.trades
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Make prop-firm-screenshots bucket public for easier image display
UPDATE storage.buckets
SET public = true
WHERE id = 'prop-firm-screenshots';

-- Update storage policies for prop-firm-screenshots to allow public read
CREATE POLICY "Public can view prop firm screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'prop-firm-screenshots');

CREATE POLICY "Users can upload their own prop firm screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'prop-firm-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own prop firm screenshots"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'prop-firm-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own prop firm screenshots"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'prop-firm-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);