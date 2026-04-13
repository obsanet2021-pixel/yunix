-- Create table for prop firm certificate sizes
CREATE TABLE public.prop_firm_certificate_sizes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prop_firm_name text NOT NULL,
  certificate_type text NOT NULL,
  size text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_prop_firm_certificate_sizes_firm ON public.prop_firm_certificate_sizes(prop_firm_name);

-- Enable Row Level Security
ALTER TABLE public.prop_firm_certificate_sizes ENABLE ROW LEVEL SECURITY;

-- CEO can manage all certificate sizes
CREATE POLICY "CEO can manage certificate sizes" 
ON public.prop_firm_certificate_sizes 
FOR ALL 
USING (is_ceo(auth.uid()));

-- All authenticated users can view certificate sizes (for Help Center)
CREATE POLICY "Authenticated users can view certificate sizes" 
ON public.prop_firm_certificate_sizes 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_prop_firm_certificate_sizes_updated_at
BEFORE UPDATE ON public.prop_firm_certificate_sizes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();