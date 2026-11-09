package com.finguard.service;

import com.finguard.entity.*;
import com.finguard.exception.ResourceNotFoundException;
import com.finguard.repository.*;
import com.finguard.security.UserPrincipal;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Service managing Sandbox Demo lifecycle, baseline provisioning, and strict isolation.
 * Uses JdbcTemplate for deterministic, conflict-free provisioning of canonical demo records.
 */
@Service
public class DemoService {

    public static final UUID DEMO_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000010");
    public static final UUID DEMO_CHECKING_ID = UUID.fromString("00000000-0000-0000-0000-000000000011");
    public static final UUID DEMO_SAVINGS_ID = UUID.fromString("00000000-0000-0000-0000-000000000012");
    public static final UUID DEMO_ESCROW_ID = UUID.fromString("00000000-0000-0000-0000-000000000013");
    public static final UUID CLEARING_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    public static final UUID CLEARING_ACCOUNT_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");

    private static final String DEMO_PASSWORD_HASH = "$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

    private final JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final AuditService auditService;
    private final org.springframework.core.env.Environment environment;

    public DemoService(
            JdbcTemplate jdbcTemplate,
            UserRepository userRepository,
            AccountRepository accountRepository,
            AuditService auditService,
            org.springframework.core.env.Environment environment) {
        this.jdbcTemplate = jdbcTemplate;
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.auditService = auditService;
        this.environment = environment;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        if (!Arrays.asList(environment.getActiveProfiles()).contains("test")) {
            try {
                ensureDemoDataProvisioned();
            } catch (Exception e) {
                // Ignore during certain slice initializations
            }
        }
    }

    /**
     * Idempotently ensures the dedicated demo identity, accounts, and 12 baseline transactions exist.
     */
    @Transactional
    public synchronized User ensureDemoDataProvisioned() {
        UUID clearingAccountId = getOrCreateClearingAccountId();

        // 2. Ensure demo user exists
        Integer demoUserCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE id = ? OR email = 'demo@finguard.app'", Integer.class, DEMO_USER_ID);
        if (demoUserCount == null || demoUserCount == 0) {
            jdbcTemplate.update(
                    "INSERT INTO users (id, name, email, password_hash, role, enabled, created_at, updated_at) " +
                            "VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                    DEMO_USER_ID, "Alex Morgan", "demo@finguard.app", DEMO_PASSWORD_HASH, "DEMO_USER", true
            );
        }

        // 3. Ensure 3 demo accounts exist
        ensureAccount(DEMO_CHECKING_ID, DEMO_USER_ID, "DEMO-CHK-8492", "CHECKING", new BigDecimal("85400.00"));
        ensureAccount(DEMO_SAVINGS_ID, DEMO_USER_ID, "DEMO-SAV-3910", "SAVINGS", new BigDecimal("120400.00"));
        ensureAccount(DEMO_ESCROW_ID, DEMO_USER_ID, "DEMO-ESC-7721", "ESCROW", new BigDecimal("40000.00"));

        // 4. Ensure 12 baseline transactions exist
        Integer txCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM financial_transactions WHERE account_id = ?", Integer.class, DEMO_CHECKING_ID);
        if (txCount == null || txCount == 0) {
            provisionBaselineTransactions(clearingAccountId);
        }

        return userRepository.findById(DEMO_USER_ID)
                .orElseThrow(() -> new ResourceNotFoundException("Demo user account not found."));
    }

    private UUID getOrCreateClearingAccountId() {
        List<UUID> existingIds = jdbcTemplate.query(
                "SELECT id FROM accounts WHERE account_number = 'SYS-CLEARING-USD' OR account_type = 'CLEARING'",
                (rs, rowNum) -> (UUID) rs.getObject("id")
        );
        if (!existingIds.isEmpty()) {
            return existingIds.get(0);
        }

        // Ensure system user exists
        List<UUID> userIds = jdbcTemplate.query(
                "SELECT id FROM users WHERE email = 'system@finguard.internal'",
                (rs, rowNum) -> (UUID) rs.getObject("id")
        );
        UUID sysUserId = userIds.isEmpty() ? CLEARING_USER_ID : userIds.get(0);
        if (userIds.isEmpty()) {
            jdbcTemplate.update(
                    "INSERT INTO users (id, name, email, password_hash, role, enabled, created_at, updated_at) " +
                            "VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                    CLEARING_USER_ID, "FinGuard Clearing Vault", "system@finguard.internal", DEMO_PASSWORD_HASH, "ADMINISTRATOR", false
            );
        }

        jdbcTemplate.update(
                "INSERT INTO accounts (id, user_id, account_number, account_type, currency, balance, available_balance, daily_limit, status, created_at, updated_at) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                CLEARING_ACCOUNT_ID, sysUserId, "SYS-CLEARING-USD", "CLEARING", "USD",
                BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("1000000000.00"), "ACTIVE"
        );
        return CLEARING_ACCOUNT_ID;
    }

    private void ensureAccount(UUID id, UUID userId, String number, String type, BigDecimal balance) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM accounts WHERE id = ? OR account_number = ?", Integer.class, id, number);
        if (count == null || count == 0) {
            jdbcTemplate.update(
                    "INSERT INTO accounts (id, user_id, account_number, account_type, currency, balance, available_balance, daily_limit, status, created_at, updated_at) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                    id, userId, number, type, "USD", balance, balance, new BigDecimal("250000.00"), "ACTIVE"
            );
        }
    }

    /**
     * Resets the dedicated demo environment to its baseline state ($245,800.00 across 3 accounts, 12 transactions).
     * Strictly restricted to Role.DEMO_USER or Role.ADMINISTRATOR. Never affects normal user accounts.
     */
    @Transactional
    public Map<String, Object> resetDemoEnvironment(UserPrincipal principal) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication required to reset demo environment.");
        }

        if (principal.getRole() != Role.DEMO_USER && principal.getRole() != Role.ADMINISTRATOR) {
            throw new AccessDeniedException("Only demo users or administrators are authorized to reset demo accounts.");
        }

        ensureDemoDataProvisioned();

        // 1. Delete all ledger entries associated with demo transactions
        jdbcTemplate.update(
                "DELETE FROM ledger_entries WHERE transaction_id IN (" +
                        "SELECT id FROM financial_transactions WHERE account_id IN (?, ?, ?)" +
                        ")",
                DEMO_CHECKING_ID, DEMO_SAVINGS_ID, DEMO_ESCROW_ID
        );

        // 2. Delete all financial transactions for demo accounts
        jdbcTemplate.update(
                "DELETE FROM financial_transactions WHERE account_id IN (?, ?, ?)",
                DEMO_CHECKING_ID, DEMO_SAVINGS_ID, DEMO_ESCROW_ID
        );

        // 3. Delete demo idempotency records
        jdbcTemplate.update("DELETE FROM idempotency_records WHERE user_id = ?", DEMO_USER_ID);

        // 4. Delete any extra accounts created during demo session
        jdbcTemplate.update(
                "DELETE FROM accounts WHERE user_id = ? AND id NOT IN (?, ?, ?)",
                DEMO_USER_ID, DEMO_CHECKING_ID, DEMO_SAVINGS_ID, DEMO_ESCROW_ID
        );

        // 5. Restore canonical account balances
        jdbcTemplate.update(
                "UPDATE accounts SET balance = ?, available_balance = ?, status = 'ACTIVE' WHERE id = ?",
                new BigDecimal("85400.00"), new BigDecimal("85400.00"), DEMO_CHECKING_ID
        );
        jdbcTemplate.update(
                "UPDATE accounts SET balance = ?, available_balance = ?, status = 'ACTIVE' WHERE id = ?",
                new BigDecimal("120400.00"), new BigDecimal("120400.00"), DEMO_SAVINGS_ID
        );
        jdbcTemplate.update(
                "UPDATE accounts SET balance = ?, available_balance = ?, status = 'ACTIVE' WHERE id = ?",
                new BigDecimal("40000.00"), new BigDecimal("40000.00"), DEMO_ESCROW_ID
        );

        // 6. Re-seed 12 baseline double-entry transactions
        UUID clearingAccountId = getOrCreateClearingAccountId();
        provisionBaselineTransactions(clearingAccountId);

        // 7. Record immutable audit event
        auditService.recordEvent(
                principal.getId(),
                "DEMO_SANDBOX_RESET",
                "USER",
                DEMO_USER_ID.toString(),
                UUID.randomUUID().toString().substring(0, 8),
                "Restored demo environment to baseline ($245,800.00 across 3 accounts, 12 transactions)."
        );

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("message", "Demo environment reset to baseline ($245,800.00 across 3 accounts, 12 transactions).");
        result.put("totalBalance", new BigDecimal("245800.00"));
        result.put("accountsCount", 3);
        result.put("transactionsCount", 12);
        return result;
    }

    private void provisionBaselineTransactions(UUID clearingAccountId) {
        Instant now = Instant.now();

        insertTxWithLedger(
                UUID.fromString("00000000-0000-0000-0000-000000000021"),
                "TXN-DEMO-DEP-849201", DEMO_CHECKING_ID, "DEPOSIT",
                new BigDecimal("100000.00"), "Treasury Inflow / Initial Liquidity Allocation",
                now.minus(28, ChronoUnit.DAYS),
                UUID.fromString("00000000-0000-0000-0000-000000000031"), clearingAccountId, "DEBIT",
                UUID.fromString("00000000-0000-0000-0000-000000000032"), DEMO_CHECKING_ID, "CREDIT"
        );

        insertTxWithLedger(
                UUID.fromString("00000000-0000-0000-0000-000000000022"),
                "TXN-DEMO-TRF-849202", DEMO_CHECKING_ID, "TRANSFER",
                new BigDecimal("40000.00"), "Reserve Allocation to Escrow Vault DEMO-ESC-7721",
                now.minus(26, ChronoUnit.DAYS),
                UUID.fromString("00000000-0000-0000-0000-000000000033"), DEMO_CHECKING_ID, "DEBIT",
                UUID.fromString("00000000-0000-0000-0000-000000000034"), DEMO_ESCROW_ID, "CREDIT"
        );

        insertTxWithLedger(
                UUID.fromString("00000000-0000-0000-0000-000000000023"),
                "TXN-DEMO-DEP-391001", DEMO_SAVINGS_ID, "DEPOSIT",
                new BigDecimal("150000.00"), "High-Yield Institutional Capital Deposit",
                now.minus(24, ChronoUnit.DAYS),
                UUID.fromString("00000000-0000-0000-0000-000000000035"), clearingAccountId, "DEBIT",
                UUID.fromString("00000000-0000-0000-0000-000000000036"), DEMO_SAVINGS_ID, "CREDIT"
        );

        insertTxWithLedger(
                UUID.fromString("00000000-0000-0000-0000-000000000024"),
                "TXN-DEMO-WDR-391002", DEMO_SAVINGS_ID, "WITHDRAWAL",
                new BigDecimal("15000.00"), "Operational Capital Disbursement",
                now.minus(21, ChronoUnit.DAYS),
                UUID.fromString("00000000-0000-0000-0000-000000000037"), DEMO_SAVINGS_ID, "DEBIT",
                UUID.fromString("00000000-0000-0000-0000-000000000038"), clearingAccountId, "CREDIT"
        );

        insertTxWithLedger(
                UUID.fromString("00000000-0000-0000-0000-000000000025"),
                "TXN-DEMO-TRF-391003", DEMO_SAVINGS_ID, "TRANSFER",
                new BigDecimal("20000.00"), "Internal Liquidity Rebalancing to Checking DEMO-CHK-8492",
                now.minus(18, ChronoUnit.DAYS),
                UUID.fromString("00000000-0000-0000-0000-000000000039"), DEMO_SAVINGS_ID, "DEBIT",
                UUID.fromString("00000000-0000-0000-0000-00000000003a"), DEMO_CHECKING_ID, "CREDIT"
        );

        insertTxWithLedger(
                UUID.fromString("00000000-0000-0000-0000-000000000026"),
                "TXN-DEMO-DEP-849203", DEMO_CHECKING_ID, "DEPOSIT",
                new BigDecimal("25000.00"), "Inbound Client Settlement Payment",
                now.minus(15, ChronoUnit.DAYS),
                UUID.fromString("00000000-0000-0000-0000-00000000003b"), clearingAccountId, "DEBIT",
                UUID.fromString("00000000-0000-0000-0000-00000000003c"), DEMO_CHECKING_ID, "CREDIT"
        );

        insertTxWithLedger(
                UUID.fromString("00000000-0000-0000-0000-000000000027"),
                "TXN-DEMO-WDR-849204", DEMO_CHECKING_ID, "WITHDRAWAL",
                new BigDecimal("8500.00"), "Custodial Infrastructure Maintenance Fee",
                now.minus(12, ChronoUnit.DAYS),
                UUID.fromString("00000000-0000-0000-0000-00000000003d"), DEMO_CHECKING_ID, "DEBIT",
                UUID.fromString("00000000-0000-0000-0000-00000000003e"), clearingAccountId, "CREDIT"
        );

        insertTxWithLedger(
                UUID.fromString("00000000-0000-0000-0000-000000000028"),
                "TXN-DEMO-TRF-849205", DEMO_CHECKING_ID, "TRANSFER",
                new BigDecimal("15000.00"), "Monthly Treasury Sweep to High-Yield Vault DEMO-SAV-3910",
                now.minus(9, ChronoUnit.DAYS),
                UUID.fromString("00000000-0000-0000-0000-00000000003f"), DEMO_CHECKING_ID, "DEBIT",
                UUID.fromString("00000000-0000-0000-0000-000000000040"), DEMO_SAVINGS_ID, "CREDIT"
        );

        insertTxWithLedger(
                UUID.fromString("00000000-0000-0000-0000-000000000029"),
                "TXN-DEMO-WDR-391004", DEMO_SAVINGS_ID, "WITHDRAWAL",
                new BigDecimal("12000.00"), "Authorized External Yield Reinvestment",
                now.minus(6, ChronoUnit.DAYS),
                UUID.fromString("00000000-0000-0000-0000-000000000041"), DEMO_SAVINGS_ID, "DEBIT",
                UUID.fromString("00000000-0000-0000-0000-000000000042"), clearingAccountId, "CREDIT"
        );

        insertTxWithLedger(
                UUID.fromString("00000000-0000-0000-0000-00000000002a"),
                "TXN-DEMO-DEP-849206", DEMO_CHECKING_ID, "DEPOSIT",
                new BigDecimal("10000.00"), "Audit Dividend Inflow",
                now.minus(4, ChronoUnit.DAYS),
                UUID.fromString("00000000-0000-0000-0000-000000000043"), clearingAccountId, "DEBIT",
                UUID.fromString("00000000-0000-0000-0000-000000000044"), DEMO_CHECKING_ID, "CREDIT"
        );

        insertTxWithLedger(
                UUID.fromString("00000000-0000-0000-0000-00000000002b"),
                "TXN-DEMO-WDR-849207", DEMO_CHECKING_ID, "WITHDRAWAL",
                new BigDecimal("6100.00"), "Vendor Settlement Disbursement",
                now.minus(2, ChronoUnit.DAYS),
                UUID.fromString("00000000-0000-0000-0000-000000000045"), DEMO_CHECKING_ID, "DEBIT",
                UUID.fromString("00000000-0000-0000-0000-000000000046"), clearingAccountId, "CREDIT"
        );

        insertTxWithLedger(
                UUID.fromString("00000000-0000-0000-0000-00000000002c"),
                "TXN-DEMO-DEP-391005", DEMO_SAVINGS_ID, "DEPOSIT",
                new BigDecimal("2400.00"), "Compounded Reserve Interest Accrual",
                now.minus(1, ChronoUnit.DAYS),
                UUID.fromString("00000000-0000-0000-0000-000000000047"), clearingAccountId, "DEBIT",
                UUID.fromString("00000000-0000-0000-0000-000000000048"), DEMO_SAVINGS_ID, "CREDIT"
        );
    }

    private void insertTxWithLedger(
            UUID txId,
            String reference,
            UUID accountId,
            String type,
            BigDecimal amount,
            String description,
            Instant timestamp,
            UUID debitId,
            UUID debitAccountId,
            String debitType,
            UUID creditId,
            UUID creditAccountId,
            String creditType) {

        Timestamp sqlTimestamp = Timestamp.from(timestamp);

        Integer txExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM financial_transactions WHERE id = ? OR reference = ?",
                Integer.class, txId, reference
        );
        if (txExists == null || txExists == 0) {
            jdbcTemplate.update(
                    "INSERT INTO financial_transactions (id, reference, account_id, transaction_type, amount, currency, status, description, created_at, completed_at) " +
                            "VALUES (?, ?, ?, ?, ?, 'USD', 'COMPLETED', ?, ?, ?)",
                    txId, reference, accountId, type, amount, description, sqlTimestamp, sqlTimestamp
            );
        }

        Integer debitExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ledger_entries WHERE id = ?",
                Integer.class, debitId
        );
        if (debitExists == null || debitExists == 0) {
            jdbcTemplate.update(
                    "INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount, currency, created_at) " +
                            "VALUES (?, ?, ?, ?, ?, 'USD', ?)",
                    debitId, txId, debitAccountId, debitType, amount, sqlTimestamp
            );
        }

        Integer creditExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ledger_entries WHERE id = ?",
                Integer.class, creditId
        );
        if (creditExists == null || creditExists == 0) {
            jdbcTemplate.update(
                    "INSERT INTO ledger_entries (id, transaction_id, account_id, entry_type, amount, currency, created_at) " +
                            "VALUES (?, ?, ?, ?, ?, 'USD', ?)",
                    creditId, txId, creditAccountId, creditType, amount, sqlTimestamp
            );
        }
    }
}
