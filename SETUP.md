# SON Trading Platform - Setup Guide

## New Features

### 1. Landing Page
- **Route**: `/landing`
- Public landing page with hero section, features showcase, and CTAs
- Automatically redirects authenticated users to dashboard

### 2. Admin System
The platform now includes a role-based admin system for managing courses and content.

#### Setting Up Admin Users

To make a user an admin, you need to insert a record into the `user_roles` table:

```sql
-- Get the user's ID first
SELECT id, email FROM auth.users WHERE email = 'admin@example.com';

-- Insert admin role for the user
INSERT INTO user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'admin');
```

Or use the backend dashboard:
1. Navigate to the `user_roles` table
2. Insert a new row with:
   - `user_id`: The user's ID from auth.users
   - `role`: `admin`

#### Admin Features

Once a user has the admin role, they gain access to:

1. **Admin Profile** (`/admin/profile`)
   - Edit display name, bio, and email
   - Upload avatar image
   - Only accessible via sidebar link (visible only to admins)

2. **Course Management** (`/courses`)
   - Upload tab visible only to admins
   - Create and publish educational courses
   - Upload video URLs (YouTube, Vimeo, direct links)
   - Add categories, descriptions, and thumbnails
   - Publish/unpublish courses
   - Delete courses

### 3. Enhanced Trade Journal
- **Fixed**: Black screen issue when adding trades
- Modal now properly overlays with blur effect
- Improved form validation
- Better UX for prop firm selection

### 4. Courses Section
- **Route**: `/courses`
- Browse published courses (all authenticated users)
- Upload courses (admin only)
- Video content support
- Category filtering

### 5. AI Assistant Enhancement
- Now has access to your trading analytics
- Provides personalized advice based on:
  - Total trades
  - Win rate
  - Profit/loss statistics
  - Best and worst trades
- Context-aware responses

### 6. Scrollable Sidebar
- Fully scrollable navigation
- Active route highlighting
- Responsive collapse on mobile
- Admin profile link (admins only)

## Routes Overview

### Public Routes
- `/landing` - Marketing landing page
- `/auth` - Sign in / Sign up

### Authenticated Routes
- `/` - Welcome dashboard (home)
- `/dashboard` - Main dashboard
- `/trade-journal` - Track daily trades
- `/trade-management` - Manage trades
- `/analytics` - Performance analytics
- `/backtesting` - Strategy testing
- `/backtest-sessions` - Backtest history
- `/prop-firms` - Prop firm tracking
- `/certificates` - Achievement certificates
- `/calendar` - Economic calendar
- `/ai-chat` - AI assistant
- `/sessions` - Trading sessions
- `/courses` - Educational courses

### Admin Routes
- `/admin/profile` - Admin profile management (admin only)

## Database Schema

### New Tables

#### `user_roles`
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `role` (app_role enum: 'admin' | 'user')
- `created_at` (timestamp)

#### `profiles`
- `id` (uuid, primary key, references auth.users)
- `email` (text)
- `name` (text)
- `bio` (text)
- `avatar_url` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### `courses`
- `id` (uuid, primary key)
- `title` (text, required)
- `slug` (text, unique, required)
- `description` (text)
- `category` (text)
- `thumbnail_url` (text)
- `video_url` (text)
- `resources` (jsonb)
- `author_id` (uuid, references auth.users)
- `published` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Security

### Row Level Security (RLS)
All tables have RLS enabled with appropriate policies:

- **user_roles**: Users can view their own roles; admins can manage all roles
- **profiles**: Viewable by all; editable only by owner
- **courses**: Published courses viewable by authenticated users; all operations restricted to admins

### Admin Check Function
```sql
public.has_role(_user_id UUID, _role app_role)
```
Security definer function that checks if a user has a specific role without triggering RLS recursion.

## Testing Admin Features

1. Sign up with a new account
2. Add admin role via SQL or backend dashboard
3. Sign out and sign back in
4. Access admin features:
   - Admin Profile link in sidebar
   - Upload tab in Courses page
5. Test course creation and publishing

## Support

For issues or questions, check the console logs and ensure:
- User is properly authenticated
- Admin role is correctly assigned
- All migrations have been applied
- Storage buckets are configured (for avatar uploads)
