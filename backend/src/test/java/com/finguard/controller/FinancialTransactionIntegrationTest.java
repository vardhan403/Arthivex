package com.finguard.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finguard.entity.*;
import com.finguard.repository.*;
import com.finguard.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Phase 3 Financial Core Integration Tests.
 * Covers FIN-01 through FIN-20:
 * - Deposits, withdrawals, and balance updates
 * - Boundary conditions ($0.00, negative, scale > 2)
 * - Insufficient funds protection and balance non-negativity
 * - Double-entry ledger invariant (Total Debits == Total Credits)
 * - Atomic rollback on error / zero partial state
 * - IDOR defense on financial operations and history
 * - Payload tampering defense (balance, status, ledger entries)
 * - Audit trail creation
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FinancialTransactionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private FinancialTransactionRepository transactionRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    @Autowired
    private AuditEventRepository auditEventRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    private User alice;
    private User bob;
    private String aliceToken;
    private String bobToken;
    private Account aliceAccount;
    private Account bobAccount;
    private Account clearingAccount;

    @BeforeEach
    void setUp() {
        ledgerEntryRepository.deleteAll();
        transactionRepository.deleteAll();
        auditEventRepository.deleteAll();
        accountRepository.deleteAll();
        userRepository.deleteAll();

        // 1. Create System User and Clearing Account
        User systemUser = userRepository.save(new User(
                "FinGuard Clearing Vault",
                "system@finguard.internal",
                passwordEncoder.encode("InternalVaultKey999!"),
                Role.ADMINISTRATOR
        ));
        systemUser.setEnabled(false);
        userRepository.save(systemUser);

        Account clearing = new Account(systemUser, "SYS-CLEARING-USD", AccountType.CLEARING, "USD");
        clearing.setBalance(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        clearing.setAvailableBalance(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        clearing.setDailyLimit(new BigDecimal("1000000000.00"));
        clearingAccount = accountRepository.save(clearing);

        // 2. Create Alice (Account Holder)
        alice = userRepository.save(new User(
                "Alice Commercial",
                "alice.finance@finguard.io",
                passwordEncoder.encode("SecurePass123!"),
                Role.ACCOUNT_HOLDER
        ));
        aliceToken = jwtService.generateToken(alice);

        Account accAlice = new Account(alice, "ACC-ALICE-1001", AccountType.CHECKING, "USD");
        accAlice.setBalance(new BigDecimal("500.00").setScale(2, RoundingMode.HALF_UP));
        accAlice.setAvailableBalance(new BigDecimal("500.00").setScale(2, RoundingMode.HALF_UP));
        aliceAccount = accountRepository.save(accAlice);

        // 3. Create Bob (Account Holder)
        bob = userRepository.save(new User(
                "Bob Enterprise",
                "bob.finance@finguard.io",
                passwordEncoder.encode("SecurePass456!"),
                Role.ACCOUNT_HOLDER
        ));
        bobToken = jwtService.generateToken(bob);

        Account accBob = new Account(bob, "ACC-BOB-2002", AccountType.SAVINGS, "USD");
        accBob.setBalance(new BigDecimal("1000.00").setScale(2, RoundingMode.HALF_UP));
        accBob.setAvailableBalance(new BigDecimal("1000.00").setScale(2, RoundingMode.HALF_UP));
        bobAccount = accountRepository.save(accBob);
    }

    // ==========================================
    // FIN-01: Valid Deposit
    // ==========================================
    @Test
    @DisplayName("FIN-01: Valid deposit increases customer balance and creates completed transaction record")
    void testValidDeposit() throws Exception {
        String payload = """
            {
                "amount": 250.00,
                "description": "Customer Inbound Liquidity",
                "sourceMethod": "WIRE"
            }
            """;

        MvcResult result = mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/deposits")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("DEPOSIT"))
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.amount").value(250.00))
                .andExpect(jsonPath("$.resultingBalance").value(750.00))
                .andExpect(jsonPath("$.reference").isNotEmpty())
                .andReturn();

        // Verify account balance in database
        Account updated = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        assertThat(updated.getBalance()).isEqualByComparingTo("750.00");
        assertThat(updated.getAvailableBalance()).isEqualByComparingTo("750.00");

        // Verify transaction in database
        List<FinancialTransaction> txs = transactionRepository.findByAccountIdOrderByCreatedAtDesc(
                aliceAccount.getId(), org.springframework.data.domain.Pageable.unpaged()).getContent();
        assertThat(txs).hasSize(1);
        assertThat(txs.get(0).getStatus()).isEqualTo(TransactionStatus.COMPLETED);
        assertThat(txs.get(0).getTransactionType()).isEqualTo(TransactionType.DEPOSIT);
    }

    // ==========================================
    // FIN-02: Valid Withdrawal
    // ==========================================
    @Test
    @DisplayName("FIN-02: Valid withdrawal decreases customer balance and creates completed transaction record")
    void testValidWithdrawal() throws Exception {
        String payload = """
            {
                "amount": 150.00,
                "destinationAccount": "EXT-VAULT-9988",
                "notes": "Vendor Invoice Settlement"
            }
            """;

        mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/withdrawals")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("WITHDRAWAL"))
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.amount").value(150.00))
                .andExpect(jsonPath("$.resultingBalance").value(350.00))
                .andExpect(jsonPath("$.reference").isNotEmpty());

        Account updated = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        assertThat(updated.getBalance()).isEqualByComparingTo("350.00");
        assertThat(updated.getAvailableBalance()).isEqualByComparingTo("350.00");
    }

    // ==========================================
    // FIN-03: Deposit of $0.00 is rejected
    // ==========================================
    @Test
    @DisplayName("FIN-03: Deposit of $0.00 is rejected with 400 INVALID_AMOUNT")
    void testZeroDepositRejected() throws Exception {
        String payload = """
            {
                "amount": 0.00,
                "description": "Zero deposit test"
            }
            """;

        mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/deposits")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_AMOUNT"));

        // Ensure balance unchanged
        Account updated = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        assertThat(updated.getBalance()).isEqualByComparingTo("500.00");
    }

    // ==========================================
    // FIN-04: Negative Deposit is rejected
    // ==========================================
    @Test
    @DisplayName("FIN-04: Negative deposit (e.g. -$50.00) is rejected with 400 INVALID_AMOUNT")
    void testNegativeDepositRejected() throws Exception {
        String payload = """
            {
                "amount": -50.00,
                "description": "Negative deposit exploit"
            }
            """;

        mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/deposits")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_AMOUNT"));

        Account updated = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        assertThat(updated.getBalance()).isEqualByComparingTo("500.00");
    }

    // ==========================================
    // FIN-05: Withdrawal of $0.00 is rejected
    // ==========================================
    @Test
    @DisplayName("FIN-05: Withdrawal of $0.00 is rejected with 400 INVALID_AMOUNT")
    void testZeroWithdrawalRejected() throws Exception {
        String payload = """
            {
                "amount": 0.00,
                "notes": "Zero withdrawal test"
            }
            """;

        mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/withdrawals")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_AMOUNT"));

        Account updated = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        assertThat(updated.getBalance()).isEqualByComparingTo("500.00");
    }

    // ==========================================
    // FIN-06: Negative Withdrawal is rejected
    // ==========================================
    @Test
    @DisplayName("FIN-06: Negative withdrawal (e.g. -$25.00) is rejected with 400 INVALID_AMOUNT")
    void testNegativeWithdrawalRejected() throws Exception {
        String payload = """
            {
                "amount": -25.00,
                "notes": "Negative withdrawal attempt"
            }
            """;

        mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/withdrawals")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_AMOUNT"));

        Account updated = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        assertThat(updated.getBalance()).isEqualByComparingTo("500.00");
    }

    // ==========================================
    // FIN-07: Withdrawal exceeding balance rejected
    // ==========================================
    @Test
    @DisplayName("FIN-07: Withdrawal exceeding available balance rejected with 422 INSUFFICIENT_FUNDS")
    void testWithdrawalExceedingBalanceRejected() throws Exception {
        String payload = """
            {
                "amount": 500.01,
                "notes": "Overdraft attempt"
            }
            """;

        mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/withdrawals")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error").value("INSUFFICIENT_FUNDS"));
    }

    // ==========================================
    // FIN-08: Customer balance never becomes negative
    // ==========================================
    @Test
    @DisplayName("FIN-08: Customer balance never becomes negative after failed overdraft attempt")
    void testCustomerBalanceNeverNegative() throws Exception {
        String payload = """
            {
                "amount": 99999.00,
                "notes": "Massive overdraft attempt"
            }
            """;

        mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/withdrawals")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnprocessableEntity());

        Account updated = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        assertThat(updated.getBalance()).isEqualByComparingTo("500.00");
        assertThat(updated.getBalance()).isGreaterThanOrEqualTo(BigDecimal.ZERO);
    }

    // ==========================================
    // FIN-09: Double-entry invariant on Deposit
    // ==========================================
    @Test
    @DisplayName("FIN-09: Successful deposit creates balanced double-entry ledger entries (Total Debits == Total Credits)")
    void testDoubleEntryInvariantOnDeposit() throws Exception {
        String payload = """
            {
                "amount": 300.00,
                "description": "Double entry verification deposit"
            }
            """;

        MvcResult result = mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/deposits")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode responseNode = objectMapper.readTree(result.getResponse().getContentAsString());
        UUID txId = UUID.fromString(responseNode.get("id").asText());

        List<LedgerEntry> entries = ledgerEntryRepository.findByTransactionId(txId);
        assertThat(entries).hasSize(2);

        BigDecimal totalDebits = entries.stream()
                .filter(e -> e.getEntryType() == LedgerEntryType.DEBIT)
                .map(LedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCredits = entries.stream()
                .filter(e -> e.getEntryType() == LedgerEntryType.CREDIT)
                .map(LedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(totalDebits).isEqualByComparingTo(new BigDecimal("300.00"));
        assertThat(totalCredits).isEqualByComparingTo(new BigDecimal("300.00"));
        assertThat(totalDebits).isEqualByComparingTo(totalCredits);

        // Customer account credited, clearing account debited
        LedgerEntry debitEntry = entries.stream().filter(e -> e.getEntryType() == LedgerEntryType.DEBIT).findFirst().orElseThrow();
        LedgerEntry creditEntry = entries.stream().filter(e -> e.getEntryType() == LedgerEntryType.CREDIT).findFirst().orElseThrow();

        assertThat(debitEntry.getAccount().getAccountType()).isEqualTo(AccountType.CLEARING);
        assertThat(creditEntry.getAccount().getId()).isEqualTo(aliceAccount.getId());
    }

    // ==========================================
    // FIN-10: Double-entry invariant on Withdrawal
    // ==========================================
    @Test
    @DisplayName("FIN-10: Successful withdrawal creates balanced double-entry ledger entries (Total Debits == Total Credits)")
    void testDoubleEntryInvariantOnWithdrawal() throws Exception {
        String payload = """
            {
                "amount": 200.00,
                "notes": "Double entry verification withdrawal"
            }
            """;

        MvcResult result = mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/withdrawals")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode responseNode = objectMapper.readTree(result.getResponse().getContentAsString());
        UUID txId = UUID.fromString(responseNode.get("id").asText());

        List<LedgerEntry> entries = ledgerEntryRepository.findByTransactionId(txId);
        assertThat(entries).hasSize(2);

        BigDecimal totalDebits = entries.stream()
                .filter(e -> e.getEntryType() == LedgerEntryType.DEBIT)
                .map(LedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCredits = entries.stream()
                .filter(e -> e.getEntryType() == LedgerEntryType.CREDIT)
                .map(LedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(totalDebits).isEqualByComparingTo(new BigDecimal("200.00"));
        assertThat(totalCredits).isEqualByComparingTo(new BigDecimal("200.00"));
        assertThat(totalDebits).isEqualByComparingTo(totalCredits);

        // Customer account debited, clearing account credited
        LedgerEntry debitEntry = entries.stream().filter(e -> e.getEntryType() == LedgerEntryType.DEBIT).findFirst().orElseThrow();
        LedgerEntry creditEntry = entries.stream().filter(e -> e.getEntryType() == LedgerEntryType.CREDIT).findFirst().orElseThrow();

        assertThat(debitEntry.getAccount().getId()).isEqualTo(aliceAccount.getId());
        assertThat(creditEntry.getAccount().getAccountType()).isEqualTo(AccountType.CLEARING);
    }

    // ==========================================
    // FIN-11: Zero partial state on error
    // ==========================================
    @Test
    @DisplayName("FIN-11: Failed financial operation leaves zero partial state (balance, ledger, transaction count unchanged)")
    void testZeroPartialStateOnFailure() throws Exception {
        long txCountBefore = transactionRepository.count();
        long ledgerCountBefore = ledgerEntryRepository.count();

        String payload = """
            {
                "amount": 9999.00,
                "notes": "Failing transaction"
            }
            """;

        mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/withdrawals")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnprocessableEntity());

        long txCountAfter = transactionRepository.count();
        long ledgerCountAfter = ledgerEntryRepository.count();

        assertThat(txCountAfter).isEqualTo(txCountBefore);
        assertThat(ledgerCountAfter).isEqualTo(ledgerCountBefore);

        Account updated = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        assertThat(updated.getBalance()).isEqualByComparingTo("500.00");
    }

    // ==========================================
    // FIN-12: Cross-user deposit IDOR blocked
    // ==========================================
    @Test
    @DisplayName("FIN-12: Alice cannot deposit into Bob's account (403 ACCESS_DENIED)")
    void testCrossUserDepositBlocked() throws Exception {
        String payload = """
            {
                "amount": 100.00,
                "description": "Unauthorized deposit into Bob's account"
            }
            """;

        mockMvc.perform(post("/api/v1/accounts/" + bobAccount.getId() + "/deposits")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("ACCESS_DENIED"));

        // Bob's balance remains intact
        Account bobUpdated = accountRepository.findById(bobAccount.getId()).orElseThrow();
        assertThat(bobUpdated.getBalance()).isEqualByComparingTo("1000.00");
    }

    // ==========================================
    // FIN-13: Cross-user withdrawal IDOR blocked
    // ==========================================
    @Test
    @DisplayName("FIN-13: Alice cannot withdraw from Bob's account (403 ACCESS_DENIED)")
    void testCrossUserWithdrawalBlocked() throws Exception {
        String payload = """
            {
                "amount": 100.00,
                "notes": "Unauthorized withdrawal attempt from Bob"
            }
            """;

        mockMvc.perform(post("/api/v1/accounts/" + bobAccount.getId() + "/withdrawals")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("ACCESS_DENIED"));

        Account bobUpdated = accountRepository.findById(bobAccount.getId()).orElseThrow();
        assertThat(bobUpdated.getBalance()).isEqualByComparingTo("1000.00");
    }

    // ==========================================
    // FIN-14: Cross-user transaction history IDOR blocked
    // ==========================================
    @Test
    @DisplayName("FIN-14: Alice cannot read Bob's transaction history (403 ACCESS_DENIED)")
    void testCrossUserTransactionHistoryBlocked() throws Exception {
        mockMvc.perform(get("/api/v1/accounts/" + bobAccount.getId() + "/transactions")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("ACCESS_DENIED"));
    }

    // ==========================================
    // FIN-15: Cross-user transaction details IDOR blocked
    // ==========================================
    @Test
    @DisplayName("FIN-15: Alice cannot read Bob's transaction details by ID (403 ACCESS_DENIED)")
    void testCrossUserTransactionDetailsBlocked() throws Exception {
        // Create a transaction on Bob's account using Bob's token
        String payload = """
            {
                "amount": 100.00,
                "notes": "Bob's private transaction"
            }
            """;

        MvcResult result = mockMvc.perform(post("/api/v1/accounts/" + bobAccount.getId() + "/withdrawals")
                        .header("Authorization", "Bearer " + bobToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        UUID bobTxId = UUID.fromString(node.get("id").asText());

        // Alice attempts to inspect Bob's transaction details
        mockMvc.perform(get("/api/v1/transactions/" + bobTxId)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("ACCESS_DENIED"));

        // Bob can read his own transaction details
        mockMvc.perform(get("/api/v1/transactions/" + bobTxId)
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transaction.id").value(bobTxId.toString()))
                .andExpect(jsonPath("$.isBalanced").value(true));
    }

    // ==========================================
    // FIN-16: Payload parameter tampering: balance injection
    // ==========================================
    @Test
    @DisplayName("FIN-16: Client cannot manipulate balance through request fields")
    void testClientCannotManipulateBalanceInPayload() throws Exception {
        String maliciousPayload = """
            {
                "amount": 100.00,
                "balance": 9999999.00,
                "availableBalance": 9999999.00,
                "resultingBalance": 9999999.00,
                "description": "Balance injection test"
            }
            """;

        mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/deposits")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(maliciousPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.resultingBalance").value(600.00));

        Account updated = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        assertThat(updated.getBalance()).isEqualByComparingTo("600.00");
    }

    // ==========================================
    // FIN-17: Payload parameter tampering: status injection
    // ==========================================
    @Test
    @DisplayName("FIN-17: Client cannot manipulate transaction status through request fields")
    void testClientCannotManipulateTransactionStatus() throws Exception {
        String maliciousPayload = """
            {
                "amount": 50.00,
                "status": "FAILED",
                "transactionStatus": "REVERSED",
                "notes": "Status tampering attempt"
            }
            """;

        mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/withdrawals")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(maliciousPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    // ==========================================
    // FIN-18: Payload parameter tampering: arbitrary ledger entries
    // ==========================================
    @Test
    @DisplayName("FIN-18: Client cannot inject arbitrary ledger entries through request body")
    void testClientCannotInjectArbitraryLedgerEntries() throws Exception {
        String maliciousPayload = """
            {
                "amount": 50.00,
                "ledgerEntries": [
                    { "entryType": "CREDIT", "amount": 1000000.00 }
                ],
                "description": "Ledger entry injection attempt"
            }
            """;

        MvcResult result = mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/deposits")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(maliciousPayload))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        UUID txId = UUID.fromString(node.get("id").asText());

        List<LedgerEntry> entries = ledgerEntryRepository.findByTransactionId(txId);
        // Only 2 balanced entries exist, exactly for 50.00
        assertThat(entries).hasSize(2);
        assertThat(entries.get(0).getAmount()).isEqualByComparingTo(new BigDecimal("50.00"));
        assertThat(entries.get(1).getAmount()).isEqualByComparingTo(new BigDecimal("50.00"));
    }

    // ==========================================
    // FIN-19: Audit event creation
    // ==========================================
    @Test
    @DisplayName("FIN-19: Audit event is created in audit_events table for financial operations")
    void testAuditEventCreatedOnFinancialOperation() throws Exception {
        String payload = """
            {
                "amount": 75.00,
                "description": "Audit check deposit"
            }
            """;

        mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/deposits")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("X-Correlation-Id", "CORR-TEST-7777")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated());

        List<AuditEvent> events = auditEventRepository.findByTargetId(aliceAccount.getId().toString());
        assertThat(events).isNotEmpty();
        AuditEvent event = events.get(0);
        assertThat(event.getEventType()).isEqualTo("DEPOSIT_COMPLETED");
        assertThat(event.getActorId()).isEqualTo(alice.getId());
        assertThat(event.getCorrelationId()).isEqualTo("CORR-TEST-7777");
    }

    // ==========================================
    // FIN-20: Scale validation (> 2 decimals rejected)
    // ==========================================
    @Test
    @DisplayName("FIN-20: Amount with more than 2 decimal places is rejected with 400 INVALID_AMOUNT")
    void testSubCentPrecisionRejected() throws Exception {
        String payload = """
            {
                "amount": 10.005,
                "description": "Sub-cent precision exploit"
            }
            """;

        mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/deposits")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_AMOUNT"));
    }

    // ==========================================
    // Compatibility: Frontend endpoint routes
    // ==========================================
    @Test
    @DisplayName("Frontend Compatibility: POST /api/transactions/deposit and /withdraw work seamlessly")
    void testFrontendEndpointsCompatibility() throws Exception {
        // Test /api/transactions/deposit
        String depositPayload = String.format("""
            {
                "accountId": "%s",
                "amount": 120.00,
                "description": "Frontend route deposit",
                "sourceMethod": "ACH"
            }
            """, aliceAccount.getId());

        mockMvc.perform(post("/api/transactions/deposit")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(depositPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.resultingBalance").value(620.00));

        // Test /api/transactions/withdraw
        String withdrawPayload = String.format("""
            {
                "accountId": "%s",
                "amount": 70.00,
                "destinationAccount": "EXT-BANK-1122",
                "routingNumber": "123456789",
                "notes": "Frontend route withdrawal"
            }
            """, aliceAccount.getId());

        mockMvc.perform(post("/api/transactions/withdraw")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(withdrawPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.resultingBalance").value(550.00));
    }
}
