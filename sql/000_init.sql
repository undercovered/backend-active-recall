-- ============================================================
-- 000_init.sql
-- Base setup: extensions and shared helper functions.
-- Run this before the table scripts.
-- ============================================================

-- gen_random_uuid() is built-in on PostgreSQL 13+, but enabling
-- pgcrypto keeps things portable on older servers and is a no-op otherwise.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Reusable trigger function to keep `updated_at` fresh on every UPDATE.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
