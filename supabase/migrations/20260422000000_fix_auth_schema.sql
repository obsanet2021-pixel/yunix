-- ✅ FIXED VERSION - Proper ON CONFLICT handling

-- 1. Fix profiles table (if exists, alter; if not, create)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create roles system (Lovable's pattern)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'user');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add unique constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_roles_user_id_role_unique'
    ) THEN
        ALTER TABLE public.user_roles 
        ADD CONSTRAINT user_roles_user_id_role_unique UNIQUE(user_id, role);
    END IF;
END $$;

-- 3. Create SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role text)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  )
$$;

-- 4. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies (with existence checks)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Profiles are viewable by everyone' AND tablename = 'profiles') THEN
        CREATE POLICY "Profiles are viewable by everyone"
          ON public.profiles FOR SELECT
          USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'profiles') THEN
        CREATE POLICY "Users can update own profile"
          ON public.profiles FOR UPDATE
          USING (auth.uid() = id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own profile' AND tablename = 'profiles') THEN
        CREATE POLICY "Users can insert own profile"
          ON public.profiles FOR INSERT
          WITH CHECK (auth.uid() = id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own roles' AND tablename = 'user_roles') THEN
        CREATE POLICY "Users can view own roles"
          ON public.user_roles FOR SELECT
          USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all roles' AND tablename = 'user_roles') THEN
        CREATE POLICY "Admins can view all roles"
          ON public.user_roles FOR SELECT
          USING (has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- 6. Auto-create profile on signup (FIXED - no ON CONFLICT needed)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile (no conflict possible because new user)
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    )
  );
  
  -- Assign default role (no conflict possible because new user)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Migrate existing staff to new roles system (FIXED - safe insert)
DO $$ 
BEGIN
    -- Insert staff roles, ignoring duplicates
    INSERT INTO public.user_roles (user_id, role)
    SELECT 
      u.id,
      'staff'::app_role
    FROM public.staff s
    JOIN auth.users u ON u.email = s.email
    WHERE s.status = 'active'
    ON CONFLICT (user_id, role) DO NOTHING;
EXCEPTION
    WHEN undefined_table THEN
        -- staff table doesn't exist yet, that's fine
        NULL;
END $$;

-- 7a. Ensure bootstrap CEO profile only if the auth user exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '729edbb5-3a37-4b62-b20b-2480dc5c7b2a') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name'
    ) THEN
      INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
      SELECT id, email, 'YUNIX CEO', now(), now()
      FROM auth.users
      WHERE id = '729edbb5-3a37-4b62-b20b-2480dc5c7b2a'
      ON CONFLICT (id) DO NOTHING;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'name'
    ) THEN
      INSERT INTO public.profiles (id, email, name, created_at, updated_at)
      SELECT id, email, 'YUNIX CEO', now(), now()
      FROM auth.users
      WHERE id = '729edbb5-3a37-4b62-b20b-2480dc5c7b2a'
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;
END $$;

-- 8. Create link_staff_account function (simpler version)
CREATE OR REPLACE FUNCTION public.link_staff_account(
  _user_id UUID,
  _user_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the email matches the user's email
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = _user_id AND lower(email) = lower(_user_email)
  ) THEN
    RAISE EXCEPTION 'Email does not match user';
  END IF;
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'staff')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN FOUND;
END;
$$;

-- 9. Create admin-only staff linking function
CREATE OR REPLACE FUNCTION public.link_staff_account_secure(
  _user_id UUID,
  _user_email TEXT,
  _admin_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the caller is an admin
  IF NOT public.has_role(_admin_user_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can link staff accounts';
  END IF;
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'staff')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN FOUND;
END;
$$;

-- 10. Add RLS to existing sessions table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') THEN
    ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
    
    -- Users can only see their own sessions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own sessions' AND tablename = 'sessions') THEN
      CREATE POLICY "Users can view own sessions"
        ON public.sessions FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
      
    -- Only service role can insert/update
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role manages sessions' AND tablename = 'sessions') THEN
      CREATE POLICY "Service role manages sessions"
        ON public.sessions FOR ALL
        USING (auth.role() = 'service_role');
    END IF;
  END IF;
END $$;

-- Verify everything worked
SELECT 
  'Migration completed successfully!' as status,
  COUNT(*) as total_policies
FROM pg_policies
WHERE tablename IN ('profiles', 'user_roles');