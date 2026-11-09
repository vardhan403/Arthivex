-- ==============================================================================
-- FinGuard Database Migration V3: Idempotency Records
-- Supports T-08, T-09, IDEM-01 through IDEM-08.
-- Scoped to user via UNIQUE (user_id, idempotency_key).
-- ==============================================================================

CREATE TABLE idempotency_records (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(128) NOT NULL,
    request_fingerprint VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    response_payload TEXT,
    response_status_code INT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uk_user_idempotency_key UNIQUE (user_id, idempotency_key)
);

CREATE INDEX idx_idempotency_user_key ON idempotency_records(user_id, idempotency_key);
CREATE INDEX idx_idempotency_created_at ON idempotency_records(created_at);

