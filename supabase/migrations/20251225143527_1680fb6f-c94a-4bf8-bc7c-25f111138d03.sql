-- Add final_certificate_id column to plaque_orders for YUNIX-issued certificates
ALTER TABLE public.plaque_orders 
ADD COLUMN final_certificate_id uuid REFERENCES public.final_certificates(id);

-- Make certificate_id nullable since orders can now use either certificate_id OR final_certificate_id
ALTER TABLE public.plaque_orders 
ALTER COLUMN certificate_id DROP NOT NULL;