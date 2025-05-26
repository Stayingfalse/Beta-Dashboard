-- Migration: Change user_id and link_id in link_allocations to CHAR(36) for UUID support
ALTER TABLE link_allocations 
  MODIFY COLUMN user_id CHAR(36) NOT NULL,
  MODIFY COLUMN link_id CHAR(36) NOT NULL;
