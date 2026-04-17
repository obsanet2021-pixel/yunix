-- Create invitation contest tables
-- Run this in Supabase SQL Editor

-- Create invitation_contest_leaderboard table
CREATE TABLE IF NOT EXISTS invitation_contest_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  username TEXT,
  points INTEGER DEFAULT 0,
  bonus_points INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create invitation_contest_stats table
CREATE TABLE IF NOT EXISTS invitation_contest_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  total_invites INTEGER DEFAULT 0,
  verified_signups INTEGER DEFAULT 0,
  active_traders INTEGER DEFAULT 0,
  current_points INTEGER DEFAULT 0,
  current_rank INTEGER DEFAULT 0,
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invitation_contest_leaderboard_user_id ON invitation_contest_leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_invitation_contest_leaderboard_total_points ON invitation_contest_leaderboard(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_invitation_contest_stats_user_id ON invitation_contest_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_invitation_contest_stats_invite_code ON invitation_contest_stats(invite_code);

-- Enable Row Level Security
ALTER TABLE invitation_contest_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_contest_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own leaderboard entry" ON invitation_contest_leaderboard
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view all leaderboard entries" ON invitation_contest_leaderboard
  FOR SELECT USING (true);

CREATE POLICY "Users can view their own stats" ON invitation_contest_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats" ON invitation_contest_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" ON invitation_contest_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_invitation_contest_leaderboard_updated_at
  BEFORE UPDATE ON invitation_contest_leaderboard
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invitation_contest_stats_updated_at
  BEFORE UPDATE ON invitation_contest_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
