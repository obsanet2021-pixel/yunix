-- Phase 2 Migration: Create Priority Business Tables
-- Run this FIRST in Supabase SQL Editor before importing data
-- This creates the database schema for priority business tables

-- Create prop_firms table
CREATE TABLE IF NOT EXISTS prop_firms (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_number TEXT,
  balance DECIMAL(20, 2),
  equity DECIMAL(20, 2),
  profit_target DECIMAL(20, 2),
  current_profit DECIMAL(20, 2),
  consistency_percentage DECIMAL(5, 2),
  dashboard_screenshot_url TEXT,
  account_type TEXT NOT NULL DEFAULT 'Personal',
  account_status TEXT,
  funded_balance DECIMAL(20, 2),
  investor_password TEXT,
  mt5_server TEXT,
  mt5_login TEXT,
  investor_password_encrypted TEXT,
  encryption_iv TEXT,
  bridge_url TEXT,
  bridge_api_key TEXT,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT,
  auto_sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  resources JSONB DEFAULT '[]',
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  published BOOLEAN DEFAULT false,
  level TEXT,
  hours DECIMAL(5, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  prop_firm_id UUID REFERENCES prop_firms(id) ON DELETE SET NULL,
  issued_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prop_firms_user_id ON prop_firms(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_author_id ON courses(author_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_prop_firm_id ON certificates(prop_firm_id);

-- Verify tables were created
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
