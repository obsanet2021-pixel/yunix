-- Add account_status enum and column to prop_firms table
CREATE TYPE public.account_status AS ENUM ('In Progress', 'Passed');

ALTER TABLE public.prop_firms 
ADD COLUMN account_status public.account_status DEFAULT 'In Progress';