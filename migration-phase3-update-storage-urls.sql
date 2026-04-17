-- Phase 3 Migration: Update Storage URLs
-- Replace old project URL with new project URL in all storage references
-- Old: https://bduwtkejrfmcggfwniqe.supabase.co
-- New: https://ounphbavkyrmotskydto.supabase.co

-- Update prop_firms dashboard_screenshot_url
UPDATE prop_firms
SET dashboard_screenshot_url = REPLACE(dashboard_screenshot_url, 'https://bduwtkejrfmcggfwniqe.supabase.co', 'https://ounphbavkyrmotskydto.supabase.co')
WHERE dashboard_screenshot_url LIKE 'https://bduwtkejrfmcggfwniqe.supabase.co%';

-- Update profiles avatar_url
UPDATE profiles
SET avatar_url = REPLACE(avatar_url, 'https://bduwtkejrfmcggfwniqe.supabase.co', 'https://ounphbavkyrmotskydto.supabase.co')
WHERE avatar_url LIKE 'https://bduwtkejrfmcggfwniqe.supabase.co%';

-- Update courses thumbnail_url
UPDATE courses
SET thumbnail_url = REPLACE(thumbnail_url, 'https://bduwtkejrfmcggfwniqe.supabase.co', 'https://ounphbavkyrmotskydto.supabase.co')
WHERE thumbnail_url LIKE 'https://bduwtkejrfmcggfwniqe.supabase.co%';

-- Update certificates file_url
UPDATE certificates
SET file_url = REPLACE(file_url, 'https://bduwtkejrfmcggfwniqe.supabase.co', 'https://ounphbavkyrmotskydto.supabase.co')
WHERE file_url LIKE 'https://bduwtkejrfmcggfwniqe.supabase.co%';

-- Verify updates
SELECT 'prop_firms' as table_name, COUNT(*) as updated_count FROM prop_firms WHERE dashboard_screenshot_url LIKE 'https://ounphbavkyrmotskydto.supabase.co%'
UNION ALL
SELECT 'profiles' as table_name, COUNT(*) as updated_count FROM profiles WHERE avatar_url LIKE 'https://ounphbavkyrmotskydto.supabase.co%'
UNION ALL
SELECT 'courses' as table_name, COUNT(*) as updated_count FROM courses WHERE thumbnail_url LIKE 'https://ounphbavkyrmotskydto.supabase.co%'
UNION ALL
SELECT 'certificates' as table_name, COUNT(*) as updated_count FROM certificates WHERE file_url LIKE 'https://ounphbavkyrmotskydto.supabase.co%';
