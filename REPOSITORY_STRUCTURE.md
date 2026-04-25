# Yunix Repository Structure

## Overview

This document explains the Yunix repository structure and where to place different types of files.

## Core Folders

### `/src`
**Purpose**: Application source code
- React components
- Pages
- Business logic
- UI assets
- **Add to**: All new application code

### `/supabase`
**Purpose**: Backend infrastructure and database
- Edge Functions
- Database migrations (`/supabase/migrations`)
- Supabase configuration
- **Add to**: Database schema changes, Edge Functions

### `/public`
**Purpose**: Static assets served directly
- Images
- Icons
- Favicon
- HTML entry point
- **Add to**: Static web assets only (no design files)

## Supporting Folders

### `/scripts`
**Purpose**: Utility scripts and tools
- Data import/export scripts
- Setup scripts
- One-off utilities
- **Add to**: Reusable scripts that might be needed again

### `/archive`
**Purpose**: Historical context and cold storage (not tracked in Git)
- Old migration scripts
- Phase-specific documentation
- Export files
- **Add to**: Files you want to keep but don't need in active development

**Structure**:
```
/archive/
  phase1/      - Phase 1 migration files
  phase2/      - Phase 2 documentation
  migrations/  - Old migration scripts
  exports/     - Data exports
```

## File Placement Rules

| Type | Location |
|------|----------|
| Active application code | `src/` |
| Database schema changes | `supabase/migrations/` |
| Edge Functions | `supabase/functions/` |
| Utility scripts | `scripts/` |
| Old/unused files | `archive/` |
| Design files (PSD, AI) | Do not commit (excluded by .gitignore) |
| Export files (CSV) | `archive/exports/` (excluded by .gitignore) |

## What NOT to Add

### Root Directory
- Do not add migration scripts to root
- Do not add export files to root
- Do not add design files anywhere

### `/public`
- No design binaries (PSD, AI, Sketch)
- No temporary files

### General
- No sensitive data in Git (use .env)
- No large binary files (use .gitignore)

## Git Strategy

- **Tracked**: `src/`, `supabase/`, `scripts/`, `public/` (excluding design files)
- **Ignored**: `/archive`, design files, exports, temporary files
- **Source of Truth**: Database schema in `supabase/migrations/`

## Adding New Features

1. **Frontend**: Add to `src/`
2. **Backend**: Add to `supabase/functions/`
3. **Database**: Add migration to `supabase/migrations/`
4. **Utilities**: Add to `scripts/` if reusable
5. **Old code**: Move to `archive/` if still needed locally

This structure ensures:
- Clean working directory
- Reproducible database state
- Clear separation of concerns
- Scalable team workflow
