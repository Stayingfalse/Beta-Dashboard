-- Migration: Add link allocation tracking and stats columns

-- Add stats columns to links table
ALTER TABLE links
  ADD COLUMN times_allocated INT DEFAULT 0,
  ADD COLUMN times_purchased INT DEFAULT 0,
  ADD COLUMN error_count INT DEFAULT 0;

-- Create link_allocations table (no FKs)
CREATE TABLE link_allocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  link_id INT NOT NULL,
  allocated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_additional BOOLEAN DEFAULT FALSE
);
