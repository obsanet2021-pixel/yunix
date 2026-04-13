-- Add account_type to prop_firms table
CREATE TYPE public.prop_firm_account_type AS ENUM ('Personal', 'Funded', 'Evaluation 1', 'Evaluation 2');

ALTER TABLE public.prop_firms 
ADD COLUMN account_type public.prop_firm_account_type DEFAULT 'Personal' NOT NULL;

-- Remove notes column as it's being replaced by account_type
ALTER TABLE public.prop_firms 
DROP COLUMN IF EXISTS notes;

COMMENT ON COLUMN public.prop_firms.account_type IS 'Type of prop firm account';