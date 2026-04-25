-- Add account_status enum and column to prop_firms table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'account_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.account_status AS ENUM ('In Progress', 'Passed');
  END IF;
END
$$;

ALTER TABLE public.prop_firms 
ADD COLUMN IF NOT EXISTS account_status public.account_status DEFAULT 'In Progress';