# Phase 1 Migration Instructions

## Overview
These files will migrate your users, profiles, staff, and admin roles from the old Supabase project to the new one.

## Prerequisites
- Access to your new Supabase project (https://ounphbavkyrmotskydto.supabase.co)
- Supabase Service Role Key (from Project Settings > API)

## Migration Steps

### Step 0: Create Tables
**IMPORTANT: Run this FIRST before any other steps**

1. Go to your new Supabase dashboard
2. Navigate to SQL Editor
3. Open `migration-phase1-create-tables.sql`
4. Copy and paste the SQL into the editor
5. Click "Run"
6. Verify all 3 tables were created (admin_roles, profiles, staff)

### Step 1: Import Admin Roles
1. Go to your new Supabase dashboard
2. Navigate to SQL Editor
3. Open `migration-phase1-admin-roles.sql`
4. Copy and paste the SQL into the editor
5. Click "Run"
6. Verify 16 rows were inserted

### Step 2: Import Profiles
1. In the same SQL Editor
2. Open `migration-phase1-profiles.sql`
3. Copy and paste the SQL into the editor
4. Click "Run"
5. Verify 40 rows were inserted

### Step 3: Import Staff
1. In the same SQL Editor
2. Open `migration-phase1-staff.sql`
3. Copy and paste the SQL into the editor
4. Click "Run"
5. Verify 13 rows were inserted

### Step 4: Create Auth Users
This step requires the Supabase Service Role Key and Node.js.

1. Get your Service Role Key from Supabase Dashboard > Project Settings > API
2. Install dependencies: `npm install @supabase/supabase-js`
3. Edit `migration-phase1-auth-users.js`:
   - Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual Service Role Key
4. Run the script: `node migration-phase1-auth-users.js`
5. Verify all 40 users were created

## Important Notes

### Password Reset
All migrated users will have a temporary password: `TempPassword123!`
- Users will need to use "Forgot Password" to set their own passwords
- Send an email to all users informing them of this

### Avatar Images
One profile (YUNIX CEO) has an avatar URL from the old project:
- Old URL: `https://bduwtkejrfmcggfwniqe.supabase.co/storage/v1/object/public/certificates/avatars/...`
- You'll need to re-upload this image to the new project and update the URL

### Staff Without User Accounts
One staff member (Hamza - hamzloon@gmail.com) has `user_id: NULL`:
- This staff member doesn't have a corresponding user account
- You may need to create a user account for them or remove this staff record

## Verification
After migration, verify:
1. Admin roles appear in CEO Dashboard > Features
2. Users can sign in with their email (using "Forgot Password" first)
3. Staff members can access their dashboards
4. Profile data is correct

## Next Steps
After Phase 1 is complete, proceed to:
- Phase 2: Core Business Data (certificates, courses, trades)
- Phase 3: Images (upload to new Supabase Storage)
- Phase 4: Remaining tables
