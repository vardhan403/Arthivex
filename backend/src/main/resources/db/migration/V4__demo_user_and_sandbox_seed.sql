-- ==============================================================================
-- FinGuard Flyway Migration: Role Check Constraint Update for DEMO_USER
-- Compatible with PostgreSQL 15+ and H2 in PostgreSQL mode
-- ==============================================================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('ACCOUNT_HOLDER', 'ADMINISTRATOR', 'AUDITOR', 'DEMO_USER'));
