-- Migration: Add display_mode column to t_form
-- Run this on any existing database that was bootstrapped before this change.

ALTER TABLE t_form
  ADD COLUMN IF NOT EXISTS display_mode VARCHAR(10) DEFAULT 'modal';

-- Backfill all existing forms with default value
UPDATE t_form SET display_mode = 'modal' WHERE display_mode IS NULL;
