-- Drop and recreate payment_status check constraint to include 'paid' and 'rejected'
ALTER TABLE plaque_orders DROP CONSTRAINT IF EXISTS plaque_orders_payment_status_check;
ALTER TABLE plaque_orders ADD CONSTRAINT plaque_orders_payment_status_check 
  CHECK (payment_status = ANY (ARRAY['unpaid', 'pending', 'received', 'paid', 'rejected']));

-- Drop and recreate status check constraint to include 'Rejected' and 'Processing'
ALTER TABLE plaque_orders DROP CONSTRAINT IF EXISTS plaque_orders_status_check;
ALTER TABLE plaque_orders ADD CONSTRAINT plaque_orders_status_check 
  CHECK (status = ANY (ARRAY['Pending', 'Awaiting Approval', 'Delivered', 'Rejected', 'Processing']));