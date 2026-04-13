-- Phase 1: Add structured emotion/mistake tracking columns to trades table

-- Add emotion_tag as text (will store values like: calm, confident, fearful, greedy, fomo, revenge, frustrated)
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS emotion_tag TEXT;

-- Add rule_broken boolean to track if trader broke their trading rules
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS rule_broken BOOLEAN DEFAULT false;

-- Add mistake_tags as text array (values like: early_entry, late_entry, moved_sl, removed_tp, oversized, revenge_trade, fomo_trade, chased_price)
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS mistake_tags TEXT[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.trades.emotion_tag IS 'Structured emotion tag: calm, confident, fearful, greedy, fomo, revenge, frustrated';
COMMENT ON COLUMN public.trades.rule_broken IS 'Whether the trader broke their trading rules on this trade';
COMMENT ON COLUMN public.trades.mistake_tags IS 'Array of mistake tags: early_entry, late_entry, moved_sl, removed_tp, oversized, revenge_trade, fomo_trade, chased_price';