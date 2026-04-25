-- Add pricing_id column to plaque_orders to link to plaque_prices
ALTER TABLE public.plaque_orders 
ADD COLUMN IF NOT EXISTS pricing_id uuid REFERENCES public.plaque_prices(id);

-- Add express_surcharge to plaque_prices for delivery pricing
ALTER TABLE public.plaque_prices 
ADD COLUMN IF NOT EXISTS express_surcharge numeric DEFAULT 20;

-- Update RLS policy to allow users to view active plaque prices
DROP POLICY IF EXISTS "Users can view active plaque prices" ON public.plaque_prices;
CREATE POLICY "Users can view active plaque prices" 
ON public.plaque_prices 
FOR SELECT 
USING (is_active = true OR is_ceo(auth.uid()) OR staff_has_permission(auth.uid(), 'manage_support'));