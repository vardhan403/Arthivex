-- ==============================================================================
-- Arthivex V7: Add Profile Picture Storage Support to Users Table
-- Supports secure base64 Data URL or remote image URL persistence across sessions
-- ==============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;

