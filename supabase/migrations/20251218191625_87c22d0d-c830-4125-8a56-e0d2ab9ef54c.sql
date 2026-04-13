-- Add CEO action tracking columns to plaque_orders
ALTER TABLE plaque_orders ADD COLUMN ceo_action TEXT DEFAULT NULL;
ALTER TABLE plaque_orders ADD COLUMN ceo_action_reason TEXT DEFAULT NULL;
ALTER TABLE plaque_orders ADD COLUMN ceo_action_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE plaque_orders ADD COLUMN ceo_action_by UUID DEFAULT NULL;

-- Add check constraint for ceo_action values
ALTER TABLE plaque_orders ADD CONSTRAINT plaque_orders_ceo_action_check 
  CHECK (ceo_action IS NULL OR ceo_action = ANY (ARRAY['approved', 'rejected']));