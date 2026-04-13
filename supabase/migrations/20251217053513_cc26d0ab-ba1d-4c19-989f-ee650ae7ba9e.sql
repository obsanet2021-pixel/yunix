-- Remove the size check constraint since sizes are now dynamic from plaque_prices table
ALTER TABLE public.plaque_orders DROP CONSTRAINT IF EXISTS plaque_orders_size_check;