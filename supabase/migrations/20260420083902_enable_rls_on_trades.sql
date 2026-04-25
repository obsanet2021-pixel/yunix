-- Enable RLS and add policies for trades table (CRITICAL for security)

-- Enable RLS
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Users can read their own trades
CREATE POLICY "Users can read own trades"
ON trades
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own trades
CREATE POLICY "Users can insert own trades"
ON trades
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own trades
CREATE POLICY "Users can update own trades"
ON trades
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own trades
CREATE POLICY "Users can delete own trades"
ON trades
FOR DELETE
USING (auth.uid() = user_id);

-- Prevent user_id tampering (if user_id column exists)
-- ALTER TABLE trades
-- ADD CONSTRAINT user_id_immutable
-- CHECK (user_id IS NOT NULL);
