-- Add RLS policies for sessions table to allow service role operations
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can insert sessions" ON public.sessions;
DROP POLICY IF EXISTS "Service role can read sessions" ON public.sessions;
DROP POLICY IF EXISTS "Service role can update sessions" ON public.sessions;
DROP POLICY IF EXISTS "Service role can delete sessions" ON public.sessions;

-- Service role can insert sessions (Edge Functions)
CREATE POLICY "Service role can insert sessions"
ON public.sessions
FOR INSERT
TO service_role
WITH CHECK (true);

-- Service role can read sessions (Edge Functions)
CREATE POLICY "Service role can read sessions"
ON public.sessions
FOR SELECT
TO service_role
USING (true);

-- Service role can update sessions (Edge Functions)
CREATE POLICY "Service role can update sessions"
ON public.sessions
FOR UPDATE
TO service_role
WITH CHECK (true);

-- Service role can delete sessions (Edge Functions)
CREATE POLICY "Service role can delete sessions"
ON public.sessions
FOR DELETE
TO service_role
USING (true);
