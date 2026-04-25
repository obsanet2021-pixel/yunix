-- Add final_certificate_id column to plaque_orders for YUNIX-issued certificates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'plaque_orders'
      AND column_name = 'final_certificate_id'
  ) THEN
    ALTER TABLE public.plaque_orders
      ADD COLUMN final_certificate_id uuid REFERENCES public.final_certificates(id);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'plaque_orders'
      AND column_name = 'certificate_id'
  ) THEN
    ALTER TABLE public.plaque_orders
      ALTER COLUMN certificate_id DROP NOT NULL;
  END IF;
END $$;