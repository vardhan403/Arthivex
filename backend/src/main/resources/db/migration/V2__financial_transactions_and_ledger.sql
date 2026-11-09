-- ==============================================================================
-- FinGuard Phase 3: Financial Transactions, Double-Entry Ledger & Audit Events
-- ==============================================================================

-- 1. Financial Transactions Table
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY,
    reference VARCHAR(64) NOT NULL UNIQUE,
    account_id UUID NOT NULL,
    transaction_type VARCHAR(32) NOT NULL,
    amount NUMERIC(19, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_tx_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
    CONSTRAINT chk_tx_type CHECK (transaction_type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER')),
    CONSTRAINT chk_tx_status CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    CONSTRAINT chk_tx_currency CHECK (currency IN ('USD', 'EUR')),
    CONSTRAINT chk_tx_amount_positive CHECK (amount > 0.00)
);

CREATE INDEX idx_tx_account_id ON financial_transactions(account_id);
CREATE INDEX idx_tx_reference ON financial_transactions(reference);
CREATE INDEX idx_tx_created_at ON financial_transactions(created_at);

-- 2. Ledger Entries Table (Append-only Double-Entry Accounting Records)
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY,
    transaction_id UUID NOT NULL,
    account_id UUID NOT NULL,
    entry_type VARCHAR(32) NOT NULL,
    amount NUMERIC(19, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ledger_tx FOREIGN KEY (transaction_id) REFERENCES financial_transactions(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ledger_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
    CONSTRAINT chk_ledger_type CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    CONSTRAINT chk_ledger_currency CHECK (currency IN ('USD', 'EUR')),
    CONSTRAINT chk_ledger_amount_positive CHECK (amount > 0.00)
);

CREATE INDEX idx_ledger_tx_id ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_account_id ON ledger_entries(account_id);

-- 3. Audit Events Table (Immutable Security & Financial Audit Trail)
CREATE TABLE audit_events (
    id UUID PRIMARY KEY,
    actor_id UUID,
    event_type VARCHAR(64) NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    target_id VARCHAR(64),
    correlation_id VARCHAR(64),
    details VARCHAR(1000),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_actor_id ON audit_events(actor_id);
CREATE INDEX idx_audit_target_id ON audit_events(target_id);
CREATE INDEX idx_audit_created_at ON audit_events(created_at);

-- 4. System Clearing Seed Data (System User & Clearing Account for Double-Entry Balancing)
INSERT INTO users (id, name, email, password_hash, role, enabled)
SELECT '00000000-0000-0000-0000-000000000001', 'FinGuard Clearing Vault', 'system@finguard.internal', '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ADMINISTRATOR', FALSE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'system@finguard.internal');

INSERT INTO accounts (id, user_id, account_number, account_type, currency, balance, available_balance, daily_limit, status)
SELECT '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'SYS-CLEARING-USD', 'CLEARING', 'USD', 0.00, 0.00, 1000000000.00, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE account_number = 'SYS-CLEARING-USD');

