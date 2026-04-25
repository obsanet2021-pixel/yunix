-- Add delivery tracing and link fallback support to auth_challenges
ALTER TABLE public.auth_challenges
  ADD COLUMN IF NOT EXISTS delivery_attempts JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'pending';

DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
    WHERE rel.relname = 'auth_challenges'
      AND con.contype = 'c'
      AND att.attname = 'channel'
  LOOP
    EXECUTE format('ALTER TABLE public.auth_challenges DROP CONSTRAINT %I', constraint_record.conname);
  END LOOP;

  EXECUTE 'ALTER TABLE public.auth_challenges ADD CONSTRAINT auth_challenges_channel_check CHECK (channel IN (''email'', ''telegram'', ''link''))';
  EXECUTE 'ALTER TABLE public.auth_challenges ADD CONSTRAINT auth_challenges_delivery_status_check CHECK (delivery_status IN (''pending'', ''delivered'', ''link_fallback'', ''failed''))';
END
$$;
