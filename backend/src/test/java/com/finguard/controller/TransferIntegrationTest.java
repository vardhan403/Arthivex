package com.finguard.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finguard.dto.TransferRequest;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Phase 4 Transfer & Idempotency Integration Tests.
 * Covers:
 * - AUTHZ-TRANSFER-01 to 03
 * - FIN-TRANSFER-01 to 08
 * - IDEM-01 to 08
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TransferIntegrationTest {

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
    private IdempotencyRecordRepository idempotencyRecordRepository;

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

    @BeforeEach
    void setUp() {
        idempotencyRecordRepository.deleteAll();
        ledgerEntryRepository.deleteAll();
        transactionRepository.deleteAll();
        auditEventRepository.deleteAll();
        accountRepository.deleteAll();
        userRepository.deleteAll();

        // 1. Create Alice
        alice = userRepository.save(new User(
                "Alice Transfer",
                "alice.xfer@finguard.io",
                passwordEncoder.encode("SecurePass123!"),
                Role.ACCOUNT_HOLDER
        ));
        aliceToken = jwtService.generateToken(alice);

        Account accAlice = new Account(alice, "ACC-ALICE-3001", AccountType.CHECKING, "USD");
        accAlice.setBalance(new BigDecimal("1000.00").setScale(2, RoundingMode.HALF_UP));
        accAlice.setAvailableBalance(new BigDecimal("1000.00").setScale(2, RoundingMode.HALF_UP));
        aliceAccount = accountRepository.save(accAlice);

        // 2. Create Bob
        bob = userRepository.save(new User(
                "Bob Recipient",
                "bob.xfer@finguard.io",
                passwordEncoder.encode("SecurePass456!"),
                Role.ACCOUNT_HOLDER
        ));
        bobToken = jwtService.generateToken(bob);

        Account accBob = new Account(bob, "ACC-BOB-3002", AccountType.CHECKING, "USD");
        accBob.setBalance(new BigDecimal("500.00").setScale(2, RoundingMode.HALF_UP));
        accBob.setAvailableBalance(new BigDecimal("500.00").setScale(2, RoundingMode.HALF_UP));
        bobAccount = accountRepository.save(accBob);
    }

    // ==========================================
    // AUTHZ-TRANSFER-01: Cross-user transfer blocked
    // ==========================================
    @Test
    @DisplayName("AUTHZ-TRANSFER-01: User cannot transfer from another user's account")
    void testCannotTransferFromAnotherUserAccount() throws Exception {
        String payload = String.format("""
            {
                "sourceAccountId": "%s",
                "destinationAccountId": "%s",
                "amount": 100.00,
                "description": "Unauthorized transfer attempt"
            }
            """, bobAccount.getId(), aliceAccount.getId());

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("ACCESS_DENIED"));

        // Verify balances unchanged
        assertThat(accountRepository.findById(bobAccount.getId()).orElseThrow().getBalance())
                .isEqualByComparingTo("500.00");
        assertThat(accountRepository.findById(aliceAccount.getId()).orElseThrow().getBalance())
                .isEqualByComparingTo("1000.00");
    }

    // ==========================================
    // AUTHZ-TRANSFER-02: Payload tampering source ownership
    // ==========================================
    @Test
    @DisplayName("AUTHZ-TRANSFER-02: User cannot manipulate source ownership via request fields")
    void testCannotManipulateSourceOwnership() throws Exception {
        String payload = String.format("""
            {
                "sourceAccountId": "%s",
                "sourceOwnerId": "%s",
                "userId": "%s",
                "destinationAccountId": "%s",
                "amount": 50.00
            }
            """, bobAccount.getId(), alice.getId(), alice.getId(), aliceAccount.getId());

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("ACCESS_DENIED"));
    }

    // ==========================================
    // AUTHZ-TRANSFER-03: Destination balance & status tampering
    // ==========================================
    @Test
    @DisplayName("AUTHZ-TRANSFER-03: Client cannot manipulate balance or status in transfer payload")
    void testCannotManipulateDestinationBalanceOrStatus() throws Exception {
        String key = UUID.randomUUID().toString();
        String payload = String.format("""
            {
                "sourceAccountId": "%s",
                "destinationAccountId": "%s",
                "amount": 100.00,
                "balance": 999999.00,
                "status": "COMPLETED",
                "ledgerEntries": [{"entryType": "CREDIT", "amount": 999999}]
            }
            """, aliceAccount.getId(), bobAccount.getId());

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.resultingBalance").value(900.00));

        Account aliceUpdated = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        Account bobUpdated = accountRepository.findById(bobAccount.getId()).orElseThrow();

        assertThat(aliceUpdated.getBalance()).isEqualByComparingTo("900.00");
        assertThat(bobUpdated.getBalance()).isEqualByComparingTo("600.00");
    }

    // ==========================================
    // FIN-TRANSFER-01: Valid transfer succeeds
    // ==========================================
    @Test
    @DisplayName("FIN-TRANSFER-01: Valid transfer succeeds and returns 201 Created")
    void testValidTransferSucceeds() throws Exception {
        String key = UUID.randomUUID().toString();
        String payload = String.format("""
            {
                "sourceAccountId": "%s",
                "destinationAccountId": "%s",
                "amount": 250.00,
                "description": "Invoice Settlement"
            }
            """, aliceAccount.getId(), bobAccount.getId());

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("TRANSFER"))
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.amount").value(250.00))
                .andExpect(jsonPath("$.resultingBalance").value(750.00))
                .andExpect(jsonPath("$.reference").isNotEmpty());
    }

    // ==========================================
    // FIN-TRANSFER-02: Insufficient funds transfer fails
    // ==========================================
    @Test
    @DisplayName("FIN-TRANSFER-02: Insufficient funds transfer fails with 422 INSUFFICIENT_FUNDS")
    void testInsufficientFundsTransferFails() throws Exception {
        String key = UUID.randomUUID().toString();
        String payload = String.format("""
            {
                "sourceAccountId": "%s",
                "destinationAccountId": "%s",
                "amount": 1000.01,
                "description": "Overdraft transfer"
            }
            """, aliceAccount.getId(), bobAccount.getId());

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error").value("INSUFFICIENT_FUNDS"));

        // Balances untouched
        assertThat(accountRepository.findById(aliceAccount.getId()).orElseThrow().getBalance())
                .isEqualByComparingTo("1000.00");
        assertThat(accountRepository.findById(bobAccount.getId()).orElseThrow().getBalance())
                .isEqualByComparingTo("500.00");
    }

    // ==========================================
    // FIN-TRANSFER-03 & 04 & 05: Balances & Conservation
    // ==========================================
    @Test
    @DisplayName("FIN-TRANSFER-03 to 05: Source decreases, destination increases, total money conserved")
    void testBalancesAndConservation() throws Exception {
        BigDecimal totalBefore = accountRepository.findById(aliceAccount.getId()).orElseThrow().getBalance()
                .add(accountRepository.findById(bobAccount.getId()).orElseThrow().getBalance());

        String key = UUID.randomUUID().toString();
        String payload = String.format("""
            {
                "sourceAccountId": "%s",
                "destinationAccountId": "%s",
                "amount": 350.00
            }
            """, aliceAccount.getId(), bobAccount.getId());

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated());

        Account aliceUpdated = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        Account bobUpdated = accountRepository.findById(bobAccount.getId()).orElseThrow();

        assertThat(aliceUpdated.getBalance()).isEqualByComparingTo("650.00");
        assertThat(bobUpdated.getBalance()).isEqualByComparingTo("850.00");

        BigDecimal totalAfter = aliceUpdated.getBalance().add(bobUpdated.getBalance());
        assertThat(totalAfter).isEqualByComparingTo(totalBefore);
    }

    // ==========================================
    // FIN-TRANSFER-06: Same-account transfer rejected
    // ==========================================
    @Test
    @DisplayName("FIN-TRANSFER-06: Same-account transfer is rejected with 400 INVALID_TRANSFER")
    void testSameAccountTransferRejected() throws Exception {
        String key = UUID.randomUUID().toString();
        String payload = String.format("""
            {
                "sourceAccountId": "%s",
                "destinationAccountId": "%s",
                "amount": 100.00
            }
            """, aliceAccount.getId(), aliceAccount.getId());

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_TRANSFER"));
    }

    // ==========================================
    // FIN-TRANSFER-07: Invalid amounts rejected
    // ==========================================
    @Test
    @DisplayName("FIN-TRANSFER-07: Zero, negative, and sub-cent amounts rejected with 400")
    void testInvalidAmountsRejected() throws Exception {
        // Zero
        String zeroPayload = String.format("""
            { "sourceAccountId": "%s", "destinationAccountId": "%s", "amount": 0.00 }
            """, aliceAccount.getId(), bobAccount.getId());
        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(zeroPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_AMOUNT"));

        // Negative
        String negPayload = String.format("""
            { "sourceAccountId": "%s", "destinationAccountId": "%s", "amount": -50.00 }
            """, aliceAccount.getId(), bobAccount.getId());
        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(negPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_AMOUNT"));

        // Sub-cent (> 2 decimal places)
        String subCentPayload = String.format("""
            { "sourceAccountId": "%s", "destinationAccountId": "%s", "amount": 10.005 }
            """, aliceAccount.getId(), bobAccount.getId());
        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(subCentPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_AMOUNT"));
    }

    // ==========================================
    // FIN-TRANSFER-08: Balanced double-entry ledger
    // ==========================================
    @Test
    @DisplayName("FIN-TRANSFER-08: Transfer creates balanced double-entry ledger (Debit Source, Credit Dest)")
    void testTransferLedgerBalanced() throws Exception {
        String key = UUID.randomUUID().toString();
        String payload = String.format("""
            {
                "sourceAccountId": "%s",
                "destinationAccountId": "%s",
                "amount": 400.00
            }
            """, aliceAccount.getId(), bobAccount.getId());

        MvcResult result = mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode jsonNode = objectMapper.readTree(result.getResponse().getContentAsString());
        UUID txId = UUID.fromString(jsonNode.get("id").asText());

        List<LedgerEntry> entries = ledgerEntryRepository.findByTransactionId(txId);
        assertThat(entries).hasSize(2);

        BigDecimal debits = entries.stream()
                .filter(e -> e.getEntryType() == LedgerEntryType.DEBIT)
                .map(LedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal credits = entries.stream()
                .filter(e -> e.getEntryType() == LedgerEntryType.CREDIT)
                .map(LedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(debits).isEqualByComparingTo(new BigDecimal("400.00"));
        assertThat(credits).isEqualByComparingTo(new BigDecimal("400.00"));
        assertThat(debits).isEqualByComparingTo(credits);

        LedgerEntry debitEntry = entries.stream().filter(e -> e.getEntryType() == LedgerEntryType.DEBIT).findFirst().orElseThrow();
        LedgerEntry creditEntry = entries.stream().filter(e -> e.getEntryType() == LedgerEntryType.CREDIT).findFirst().orElseThrow();

        assertThat(debitEntry.getAccount().getId()).isEqualTo(aliceAccount.getId());
        assertThat(creditEntry.getAccount().getId()).isEqualTo(bobAccount.getId());
    }

    // ==========================================
    // IDEM-01: Missing Idempotency Key
    // ==========================================
    @Test
    @DisplayName("IDEM-01: Missing Idempotency-Key header is rejected with 400 MISSING_IDEMPOTENCY_KEY")
    void testMissingIdempotencyKeyRejected() throws Exception {
        String payload = String.format("""
            {
                "sourceAccountId": "%s",
                "destinationAccountId": "%s",
                "amount": 100.00
            }
            """, aliceAccount.getId(), bobAccount.getId());

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("MISSING_IDEMPOTENCY_KEY"));
    }

    // ==========================================
    // IDEM-02 & IDEM-03: First request succeeds; same key+payload does not execute twice
    // ==========================================
    @Test
    @DisplayName("IDEM-02 & IDEM-03: First request succeeds; same key + payload replays result without double-debit")
    void testIdempotentReplay() throws Exception {
        String key = "IDEM-TEST-KEY-001";
        String payload = String.format("""
            {
                "sourceAccountId": "%s",
                "destinationAccountId": "%s",
                "amount": 200.00,
                "description": "Idempotent payment"
            }
            """, aliceAccount.getId(), bobAccount.getId());

        // First execution
        MvcResult firstResult = mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.resultingBalance").value(800.00))
                .andReturn();

        String firstResponseStr = firstResult.getResponse().getContentAsString();
        JsonNode firstNode = objectMapper.readTree(firstResponseStr);
        String firstRef = firstNode.get("reference").asText();

        // Second execution (Retry with identical key and payload)
        MvcResult secondResult = mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reference").value(firstRef))
                .andExpect(jsonPath("$.resultingBalance").value(800.00))
                .andReturn();

        // Verify balance was debited ONLY ONCE
        Account aliceUpdated = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        Account bobUpdated = accountRepository.findById(bobAccount.getId()).orElseThrow();

        assertThat(aliceUpdated.getBalance()).isEqualByComparingTo("800.00");
        assertThat(bobUpdated.getBalance()).isEqualByComparingTo("700.00");

        // Exactly 1 financial transaction in database
        assertThat(transactionRepository.count()).isEqualTo(1);
    }

    // ==========================================
    // IDEM-04: Same key + different payload is rejected
    // ==========================================
    @Test
    @DisplayName("IDEM-04: Same key + different payload is rejected with 409 IDEMPOTENCY_CONFLICT")
    void testSameKeyDifferentPayloadRejected() throws Exception {
        String key = "IDEM-CONFLICT-KEY";
        String payload1 = String.format("""
            { "sourceAccountId": "%s", "destinationAccountId": "%s", "amount": 100.00 }
            """, aliceAccount.getId(), bobAccount.getId());

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload1))
                .andExpect(status().isCreated());

        // Reusing key with different amount
        String payload2 = String.format("""
            { "sourceAccountId": "%s", "destinationAccountId": "%s", "amount": 500.00 }
            """, aliceAccount.getId(), bobAccount.getId());

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload2))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("IDEMPOTENCY_CONFLICT"));

        // Verify balance reflects ONLY the first $100 transfer
        Account aliceUpdated = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        assertThat(aliceUpdated.getBalance()).isEqualByComparingTo("900.00");
    }

    // ==========================================
    // IDEM-05: Key isolation between users
    // ==========================================
    @Test
    @DisplayName("IDEM-05: Same key used by different users is isolated correctly")
    void testKeyIsolationBetweenUsers() throws Exception {
        String sharedKey = "SHARED-USER-KEY";

        // Alice transfers $100 to Bob using sharedKey
        String alicePayload = String.format("""
            { "sourceAccountId": "%s", "destinationAccountId": "%s", "amount": 100.00 }
            """, aliceAccount.getId(), bobAccount.getId());

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", sharedKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(alicePayload))
                .andExpect(status().isCreated());

        // Bob transfers $50 to Alice using the SAME sharedKey
        String bobPayload = String.format("""
            { "sourceAccountId": "%s", "destinationAccountId": "%s", "amount": 50.00 }
            """, bobAccount.getId(), aliceAccount.getId());

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + bobToken)
                        .header("Idempotency-Key", sharedKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bobPayload))
                .andExpect(status().isCreated());

        // Both succeeded because idempotency uniqueness is (user_id, idempotency_key)
        Account aliceUpdated = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        Account bobUpdated = accountRepository.findById(bobAccount.getId()).orElseThrow();

        assertThat(aliceUpdated.getBalance()).isEqualByComparingTo("950.00"); // 1000 - 100 + 50
        assertThat(bobUpdated.getBalance()).isEqualByComparingTo("550.00");   // 500 + 100 - 50
    }

    // ==========================================
    // IDEM-07: Failed transaction leaves no false successful idempotency record
    // ==========================================
    @Test
    @DisplayName("IDEM-07: Failed transaction does not leave a false successful idempotency state")
    void testFailedTransactionLeavesNoSuccessfulIdempotencyRecord() throws Exception {
        String key = "FAILING-KEY-999";
        String payload = String.format("""
            { "sourceAccountId": "%s", "destinationAccountId": "%s", "amount": 99999.00 }
            """, aliceAccount.getId(), bobAccount.getId());

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnprocessableEntity());

        // Ensure no completed idempotency record was created
        boolean exists = idempotencyRecordRepository.existsByUserIdAndIdempotencyKey(alice.getId(), key);
        assertThat(exists).isFalse();
    }
}

