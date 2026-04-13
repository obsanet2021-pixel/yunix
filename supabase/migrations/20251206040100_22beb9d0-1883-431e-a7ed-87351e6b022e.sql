-- Add price column to plaque_orders for CEO to edit pricing
ALTER TABLE public.plaque_orders ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0;

-- Add rejected status support and approval tracking
ALTER TABLE public.plaque_orders ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;
ALTER TABLE public.plaque_orders ADD COLUMN IF NOT EXISTS approved_by uuid;