-- Add password column to users table for admin authentication
ALTER TABLE users ADD COLUMN password VARCHAR(255) NULL AFTER email;
