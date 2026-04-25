-- Add account_type to prop_firms table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'prop_firm_account_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.prop_firm_account_type AS ENUM ('Personal', 'Funded', 'Evaluation 1', 'Evaluation 2');
  END IF;
END
$$;

ALTER TABLE public.prop_firms 
ADD COLUMN IF NOT EXISTS account_type public.prop_firm_account_type DEFAULT 'Personal' NOT NULL;

-- Remove notes column as it's being replaced by account_type
ALTER TABLE public.prop_firms 
DROP COLUMN IF EXISTS notes;

COMMENT ON COLUMN public.prop_firms.account_type IS 'Type of prop firm account';