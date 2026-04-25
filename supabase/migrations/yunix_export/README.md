# Yunix Export Folder

This folder stores exported data from external servers and user data imports.

## Purpose
- Temporary storage for data exports from other systems
- Files to be imported into the main database
- User data migration files

## Important Notes
- **This folder is NOT a migration source** - files here are not executed as database migrations
- Files are for storage and manual import only
- Do not place SQL migration files in this folder
- Use the parent `migrations/` directory for actual database schema changes

## File Naming Convention
- Use descriptive names: `users_export_YYYYMMDD.csv`
- Include date stamps for versioning
- Use appropriate file extensions (.csv, .json, .sql)

## Import Process
1. Place exported files in this folder
2. Use Supabase SQL Editor or appropriate import tools
3. Do not rely on automated migration tools for these files
