-- Phase 1 Migration: Handle Staff Member with NULL user_id (Hamza)
-- This staff member has no user account - we need to either create one or remove the staff record

-- Option 1: Remove the staff record (recommended if Hamza is no longer with the company)
-- Uncomment the line below to remove the staff record:
-- DELETE FROM staff WHERE email = 'hamzloon@gmail.com';

-- Option 2: Create a user account for Hamza
-- Uncomment the following to create a user account for Hamza:
-- Note: This requires the Service Role Key and would need to be done via the auth users script

-- For now, let's just remove the staff record since Hamza has no user account
DELETE FROM staff WHERE email = 'hamzloon@gmail.com';

-- Verify the staff record was removed
SELECT * FROM staff WHERE email = 'hamzloon@gmail.com';
