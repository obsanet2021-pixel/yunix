-- Phase 1 Migration: Fix CEO User ID Mismatch
-- The CEO account already existed in auth.users with a different ID
-- This script updates the profiles and staff tables to use the correct user ID

-- Get the CEO's actual user ID from auth.users
DO $$
DECLARE
  actual_ceo_id UUID;
  old_ceo_id UUID := '729edbb5-3a37-4b62-b20b-2480dc5c7b2a';
BEGIN
  SELECT id INTO actual_ceo_id FROM auth.users WHERE email = 'obsanet2021@gmail.com';
  
  IF actual_ceo_id IS NOT NULL AND actual_ceo_id != old_ceo_id THEN
    -- Drop the foreign key constraint temporarily
    ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_user_id_fkey;
    
    -- Update staff table
    UPDATE staff SET user_id = actual_ceo_id WHERE user_id = old_ceo_id;
    
    -- Update profiles table
    UPDATE profiles SET id = actual_ceo_id WHERE id = old_ceo_id;
    
    -- Re-add the foreign key constraint
    ALTER TABLE staff 
    ADD CONSTRAINT staff_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Updated CEO user ID from % to %', old_ceo_id, actual_ceo_id;
  ELSE
    RAISE NOTICE 'CEO user ID already matches or CEO account not found';
  END IF;
END $$;

-- Verify the changes
SELECT 
  'Profiles' as table_name, 
  id, 
  email, 
  name 
FROM profiles 
WHERE email = 'obsanet2021@gmail.com'

UNION ALL

SELECT 
  'Staff' as table_name,
  user_id as id,
  email,
  name
FROM staff
WHERE email = 'obsanet2021@gmail.com';
