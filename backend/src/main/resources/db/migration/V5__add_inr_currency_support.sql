-- ==============================================================================
-- FinGuard Flyway Migration V5: Add INR Currency Support
-- Extends currency check constraints to support Indian Rupee (INR) alongside USD and EUR.
-- ==============================================================================

ALTER TABLE accounts DROP CONSTRAINT IF EXISTS chk_accounts_currency;
ALTER TABLE accounts ADD CONSTRAINT chk_accounts_currency CHECK (currency IN ('USD', 'EUR', 'INR'));

ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS chk_tx_currency;
ALTER TABLE financial_transactions ADD CONSTRAINT chk_tx_currency CHECK (currency IN ('USD', 'EUR', 'INR'));

ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS chk_ledger_currency;
ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_currency CHECK (currency IN ('USD', 'EUR', 'INR'));

