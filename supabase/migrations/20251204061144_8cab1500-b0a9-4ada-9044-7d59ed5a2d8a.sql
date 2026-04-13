-- Add invite_token column to staff table for tracking invitation links
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS invite_token text;

-- Create index for token lookup
CREATE INDEX IF NOT EXISTS idx_staff_invite_token ON public.staff(invite_token);