-- Phase 1 Migration: Remove CEO Avatar URL
-- Remove the avatar URL from CEO's profile since it points to old project

UPDATE profiles 
SET avatar_url = NULL 
WHERE email = 'obsanet2021@gmail.com';

-- Verify the avatar URL was removed
SELECT id, email, name, avatar_url 
FROM profiles 
WHERE email = 'obsanet2021@gmail.com';
