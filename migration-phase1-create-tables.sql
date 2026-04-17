-- Phase 1 Migration: Create Tables
-- Run this FIRST in Supabase SQL Editor before importing data
-- This creates the database schema for admin_roles, profiles, and staff

-- Drop existing tables to recreate without foreign key constraints
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS admin_roles CASCADE;

-- Create admin_roles table
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create profiles table
-- Note: Foreign key to auth.users removed temporarily for migration
-- Will be added after auth users are created
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  name TEXT,
  bio TEXT,
  avatar_url TEXT,
  account_type TEXT DEFAULT 'Personal',
  telegram_chat_id BIGINT,
  telegram_link_code TEXT,
  telegram_linked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role_id UUID REFERENCES admin_roles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invite_token TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_role_id ON staff(role_id);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON profiles(account_type);

-- Enable Row Level Security (optional - uncomment if needed)
-- ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
