-- Insert missing profile for CEO account
DO $$
DECLARE
  source_user_exists BOOLEAN;
  target_schema TEXT;
  has_full_name BOOLEAN;
  has_name BOOLEAN;
BEGIN
  -- Check if auth.users contains the CEO account
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = '729edbb5-3a37-4b62-b20b-2480dc5c7b2a'
  ) INTO source_user_exists;
  IF source_user_exists THEN
    target_schema := 'auth.users';
  ELSE
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
      SELECT EXISTS (
        SELECT 1 FROM public.users WHERE id = '729edbb5-3a37-4b62-b20b-2480dc5c7b2a'
      ) INTO source_user_exists;
      IF source_user_exists THEN
        target_schema := 'public.users';
      END IF;
    END IF;
  END IF;

  IF NOT source_user_exists THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name'
  ) INTO has_full_name;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'name'
  ) INTO has_name;

  IF has_full_name THEN
    EXECUTE format($sql$
      INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
      SELECT id, email, %L, now(), now()
      FROM %I
      WHERE id = %L
      ON CONFLICT (id) DO NOTHING;
    $sql$, 'YUNIX CEO', target_schema, '729edbb5-3a37-4b62-b20b-2480dc5c7b2a');
  ELSIF has_name THEN
    EXECUTE format($sql$
      INSERT INTO public.profiles (id, email, name, created_at, updated_at)
      SELECT id, email, %L, now(), now()
      FROM %I
      WHERE id = %L
      ON CONFLICT (id) DO NOTHING;
    $sql$, 'YUNIX CEO', target_schema, '729edbb5-3a37-4b62-b20b-2480dc5c7b2a');
  END IF;
END $$;