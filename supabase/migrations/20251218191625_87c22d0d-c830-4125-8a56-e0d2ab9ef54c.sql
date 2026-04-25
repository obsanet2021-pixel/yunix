-- Add CEO action tracking columns to plaque_orders
ALTER TABLE IF EXISTS plaque_orders ADD COLUMN IF NOT EXISTS ceo_action TEXT DEFAULT NULL;
ALTER TABLE IF EXISTS plaque_orders ADD COLUMN IF NOT EXISTS ceo_action_reason TEXT DEFAULT NULL;
ALTER TABLE IF EXISTS plaque_orders ADD COLUMN IF NOT EXISTS ceo_action_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE IF EXISTS plaque_orders ADD COLUMN IF NOT EXISTS ceo_action_by UUID DEFAULT NULL;

-- Add check constraint for ceo_action values if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'plaque_orders_ceo_action_check'
  ) THEN
    ALTER TABLE plaque_orders ADD CONSTRAINT plaque_orders_ceo_action_check
      CHECK (ceo_action IS NULL OR ceo_action = ANY (ARRAY['approved', 'rejected']));
  END IF;
END $$;