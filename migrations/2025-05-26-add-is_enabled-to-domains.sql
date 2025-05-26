-- Migration: Add is_enabled column to domains table
ALTER TABLE domains ADD COLUMN is_enabled BOOLEAN NOT NULL DEFAULT FALSE;
