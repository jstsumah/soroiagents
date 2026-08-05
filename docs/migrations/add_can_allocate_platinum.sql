-- ============================================================
-- Migration: Add can_allocate_platinum to profiles
-- Date: 2026-08-05
-- Purpose: Allow Super Admins to selectively grant Admins 
--          the ability to allocate the Platinum tier to agents.
-- ============================================================

-- Add the column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS can_allocate_platinum BOOLEAN DEFAULT FALSE;
