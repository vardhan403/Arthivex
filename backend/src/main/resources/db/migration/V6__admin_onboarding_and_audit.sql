-- ==============================================================================
-- FinGuard Flyway Migration V6: Admin Management, Onboarding & Enhanced Audit Logging
-- Compatible with PostgreSQL 15+ and H2 in PostgreSQL mode
-- ==============================================================================

-- 1. Onboarding Status Lifecycle Column on Users
ALTER TABLE users ADD COLUMN onboarding_status VARCHAR(32) NOT NULL DEFAULT 'PENDING';
ALTER TABLE users ADD CONSTRAINT chk_users_onboarding_status CHECK (onboarding_status IN ('PENDING', 'APPROVED', 'REJECTED'));
CREATE INDEX idx_users_onboarding_status ON users(onboarding_status);

-- Pre-existing identities (system clearing vault, demo account, existing users) are approved
UPDATE users SET onboarding_status = 'APPROVED';

-- 2. Audit Trail Enhancements: Status and Actor Email
ALTER TABLE audit_events ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS';
ALTER TABLE audit_events ADD COLUMN actor_email VARCHAR(255);
CREATE INDEX idx_audit_event_type ON audit_events(event_type);
CREATE INDEX idx_audit_status ON audit_events(status);

