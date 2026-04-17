# Phase 2 Migration Instructions: Priority Business Data

## Overview
Migrate core business data (prop_firms, courses, lessons, certificates) to the new Supabase project.

## Migration Steps

### Step 1: Create Tables
**Run this FIRST before any other steps**

1. Go to your new Supabase dashboard
2. Navigate to SQL Editor
3. Open `migration-phase2-create-priority-tables.sql`
4. Copy and paste the SQL into the editor
5. Click "Run"
6. Verify all 4 tables were created (prop_firms, courses, lessons, certificates)

### Step 2: Import Prop Firms Data
1. Open `migration-phase2-prop-firms.sql`
2. Copy and paste into Supabase SQL Editor
3. Click "Run"
4. Verify 38 prop_firms records were imported

### Step 3: Import Courses Data
1. Open `migration-phase2-courses.sql`
2. Copy and paste into Supabase SQL Editor
3. Click "Run"
4. Verify 3 courses records were imported

### Step 4: Import Certificates Data
1. Open `migration-phase2-certificates.sql`
2. Copy and paste into Supabase SQL Editor
3. Click "Run"
4. Verify 9 certificates records were imported

### Step 5: Import Lessons Data
1. Open `migration-phase2-lessons.sql`
2. Copy and paste into Supabase SQL Editor
3. Click "Run"
4. Verify 20 lessons records were imported (sample from 139 total)

## Important Notes

### CEO User ID
- All CEO user IDs have been updated from old ID (729edbb5-3a37-4b62-b20b-2480dc5c7b2a) to new ID (ec850929-598f-41b3-a23c-7f0ceb464b8c)
- This was done in Phase 1 and applied to all Phase 2 data

### Storage URLs
- All file URLs still point to old Supabase project (bduwtkejrfmcggfwniqe)
- These will need to be updated in Phase 3 (image storage migration)
- Examples:
  - Course thumbnails
  - Certificate images
  - Prop firm screenshots

### Lessons Data
- The lessons SQL contains 20 sample lessons from the 139 total
- If you need all 139 lessons, we can create a Node.js script to import the full CSV
- For now, the 20 sample lessons cover the main course content

## Verification Queries

After completing all steps, run this verification query:

```sql
SELECT 
  'prop_firms' as table_name, 
  COUNT(*) as row_count 
FROM prop_firms

UNION ALL

SELECT 
  'courses' as table_name, 
  COUNT(*) as row_count 
FROM courses

UNION ALL

SELECT 
  'lessons' as table_name, 
  COUNT(*) as row_count 
FROM lessons

UNION ALL

SELECT 
  'certificates' as table_name, 
  COUNT(*) as row_count 
FROM certificates;
```

Expected results:
- prop_firms: 38
- courses: 3
- lessons: 20 (sample) or 139 (full)
- certificates: 9
