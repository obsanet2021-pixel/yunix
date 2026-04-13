-- Add account_type enum and field to profiles table
CREATE TYPE public.account_type AS ENUM ('Personal', 'Evaluation', 'Funded');

-- Add account_type column to profiles table with default value
ALTER TABLE public.profiles 
ADD COLUMN account_type public.account_type DEFAULT 'Personal' NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.account_type IS 'Type of trading account: Personal, Evaluation, or Funded';