-- ==============================================================================
-- FinGuard Initial Database Schema (Phase 1 Foundation)
-- Compatible with PostgreSQL 15+ and H2 in PostgreSQL mode
-- ==============================================================================

-- 1. Users Table (Core Identity & Role-Based Access Control)
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'ACCOUNT_HOLDER',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_role CHECK (role IN ('ACCOUNT_HOLDER', 'ADMINISTRATOR', 'AUDITOR'))
);

CREATE INDEX idx_users_email ON users(email);

-- 2. Accounts Table (Financial Ledger Partitions)
CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    account_number VARCHAR(32) NOT NULL,
    account_type VARCHAR(32) NOT NULL DEFAULT 'CHECKING',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    balance NUMERIC(19, 2) NOT NULL DEFAULT 0.00,
    available_balance NUMERIC(19, 2) NOT NULL DEFAULT 0.00,
    daily_limit NUMERIC(19, 2) NOT NULL DEFAULT 250000.00,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT uq_accounts_number UNIQUE (account_number),
    CONSTRAINT chk_accounts_currency CHECK (currency IN ('USD', 'EUR')),
    CONSTRAINT chk_accounts_status CHECK (status IN ('ACTIVE', 'FROZEN', 'CLOSED')),
    CONSTRAINT chk_accounts_type CHECK (account_type IN ('CHECKING', 'SAVINGS', 'ESCROW', 'CLEARING')),
    CONSTRAINT chk_accounts_balance_non_negative CHECK (balance >= 0.00 OR account_type = 'CLEARING'),
    CONSTRAINT chk_accounts_avail_balance_non_negative CHECK (available_balance >= 0.00 OR account_type = 'CLEARING')
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_number ON accounts(account_number);

