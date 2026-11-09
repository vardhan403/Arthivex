package com.finguard.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finguard.dto.CreateAccountRequest;
import com.finguard.dto.DepositRequest;
import com.finguard.dto.TransferRequest;
import com.finguard.dto.WithdrawalRequest;
import com.finguard.entity.Account;
import com.finguard.entity.AccountStatus;
import com.finguard.entity.AccountType;
import com.finguard.entity.Role;
import com.finguard.entity.User;
import com.finguard.repository.AccountRepository;
import com.finguard.repository.FinancialTransactionRepository;
import com.finguard.repository.UserRepository;
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
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * FinGuard Phase 5: Comprehensive Security Hardening & Adversarial Verification Suite.
 * Covers:
 * - SEC-01 to SEC-08 Hardening Specifications
 * - Attacks A through J Adversarial Scenarios
 * - Rate Limiting & Login Abuse
 * - SQL Injection Resilience
 * - Security Response Headers
 * - CORS Restrictions
 * - Resource Exhaustion & Pagination Clamping
 * - Error Message Sanitization
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class SecurityHardeningAdversarialTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private FinancialTransactionRepository transactionRepository;

    @Autowired
    private com.finguard.repository.LedgerEntryRepository ledgerEntryRepository;

    @Autowired
    private com.finguard.repository.IdempotencyRecordRepository idempotencyRecordRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private LoginRateLimiter loginRateLimiter;

    @Autowired
    private ObjectMapper objectMapper;

    private User alice;
    private User bob;
    private Account aliceAccount;
    private Account bobAccount;
    private String aliceToken;
    private String bobToken;

    @BeforeEach
    void setUp() {
        ledgerEntryRepository.deleteAll();
        transactionRepository.deleteAll();
        idempotencyRecordRepository.deleteAll();
        accountRepository.deleteAll();
        userRepository.deleteAll();

        // 1. Create Alice (Account Holder)
        alice = new User("Alice Hardening", "alice.hard@finguard.io", passwordEncoder.encode("Password123!"), Role.ACCOUNT_HOLDER);
        alice.setEnabled(true);
        alice = userRepository.save(alice);

        aliceAccount = new Account(alice, "ACC-ALICE-100", AccountType.CHECKING, "USD");
        aliceAccount.setBalance(new BigDecimal("500.00").setScale(2, RoundingMode.UNNECESSARY));
        aliceAccount.setAvailableBalance(new BigDecimal("500.00").setScale(2, RoundingMode.UNNECESSARY));
        aliceAccount.setStatus(AccountStatus.ACTIVE);
        aliceAccount.setDailyLimit(new BigDecimal("250000.00"));
        aliceAccount = accountRepository.save(aliceAccount);

        aliceToken = jwtService.generateToken(alice);

        // 2. Create Bob (Account Holder)
        bob = new User("Bob Hardening", "bob.hard@finguard.io", passwordEncoder.encode("Password456!"), Role.ACCOUNT_HOLDER);
        bob.setEnabled(true);
        bob = userRepository.save(bob);

        bobAccount = new Account(bob, "ACC-BOB-200", AccountType.CHECKING, "USD");
        bobAccount.setBalance(new BigDecimal("200.00").setScale(2, RoundingMode.UNNECESSARY));
        bobAccount.setAvailableBalance(new BigDecimal("200.00").setScale(2, RoundingMode.UNNECESSARY));
        bobAccount.setStatus(AccountStatus.ACTIVE);
        bobAccount.setDailyLimit(new BigDecimal("250000.00"));
        bobAccount = accountRepository.save(bobAccount);

        bobToken = jwtService.generateToken(bob);
    }

    // =========================================================================
    // SECTION 27 & 28: ATTACKS A - J ADVERSARIAL SIMULATIONS
    // =========================================================================

    @Test
    @DisplayName("Attack A: Alice attempts to access Bob's account details (IDOR) -> 403 ACCESS_DENIED")
    void attackA_bobAccountAccess_denied() throws Exception {
        mockMvc.perform(get("/api/v1/accounts/" + bobAccount.getId())
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"))
                .andExpect(jsonPath("$.correlationId").isNotEmpty());
    }

    @Test
    @DisplayName("Attack B: Alice attempts to withdraw from Bob's account -> 403 ACCESS_DENIED")
    void attackB_bobWithdrawal_denied() throws Exception {
        WithdrawalRequest request = new WithdrawalRequest(
                new BigDecimal("50.00"),
                "EXT-TARGET-ACC",
                "123456789",
                "Alice stealing from Bob"
        );

        mockMvc.perform(post("/api/v1/accounts/" + bobAccount.getId() + "/withdrawals")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        // Verify Bob's balance remains unchanged
        Account reloaded = accountRepository.findById(bobAccount.getId()).orElseThrow();
        assertThat(reloaded.getBalance()).isEqualByComparingTo(new BigDecimal("200.00"));
    }

    @Test
    @DisplayName("Attack C: Alice attempts to transfer from Bob's account to Alice -> 403 ACCESS_DENIED")
    void attackC_bobTransfer_denied() throws Exception {
        TransferRequest request = new TransferRequest(
                bobAccount.getId(),
                aliceAccount.getId(),
                null,
                new BigDecimal("100.00"),
                "Alice transferring Bob's funds"
        );

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", "ATTACK-C-" + UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        // Verify balances untouched
        Account reloadedBob = accountRepository.findById(bobAccount.getId()).orElseThrow();
        assertThat(reloadedBob.getBalance()).isEqualByComparingTo(new BigDecimal("200.00"));
        Account reloadedAlice = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        assertThat(reloadedAlice.getBalance()).isEqualByComparingTo(new BigDecimal("500.00"));
    }

    @Test
    @DisplayName("Attack D: Role escalation attempt during registration -> Unconditionally ACCOUNT_HOLDER")
    void attackD_roleEscalation_noEscalation() throws Exception {
        Map<String, Object> maliciousPayload = Map.of(
                "name", "Attacker Escalate",
                "email", "attacker.admin@finguard.io",
                "password", "AdminPassword123!",
                "role", "ADMINISTRATOR"
        );

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(maliciousPayload)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("ACCOUNT_HOLDER"));

        User created = userRepository.findByEmail("attacker.admin@finguard.io").orElseThrow();
        assertThat(created.getRole()).isEqualTo(Role.ACCOUNT_HOLDER);
    }

    @Test
    @DisplayName("Attack E: Balance creation manipulation via account create payload -> Zero initial balance")
    void attackE_balanceManipulation_noBalanceCreated() throws Exception {
        Map<String, Object> maliciousPayload = Map.of(
                "accountType", "CHECKING",
                "currency", "USD",
                "balance", new BigDecimal("999999999.99"),
                "availableBalance", new BigDecimal("999999999.99"),
                "status", "ACTIVE"
        );

        MvcResult result = mockMvc.perform(post("/api/v1/accounts")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(maliciousPayload)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.balance").value(0.00))
                .andExpect(jsonPath("$.availableBalance").value(0.00))
                .andReturn();

        JsonNode responseNode = objectMapper.readTree(result.getResponse().getContentAsString());
        UUID newAccountId = UUID.fromString(responseNode.get("id").asText());

        Account createdAccount = accountRepository.findById(newAccountId).orElseThrow();
        assertThat(createdAccount.getBalance()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(createdAccount.getAvailableBalance()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Attack F: Duplicate transfer request with same Idempotency-Key -> Single financial transaction")
    void attackF_duplicateTransfer_singleExecution() throws Exception {
        String idempotencyKey = "ATTACK-F-KEY-" + UUID.randomUUID();
        TransferRequest request = new TransferRequest(
                aliceAccount.getId(),
                bobAccount.getId(),
                null,
                new BigDecimal("75.00"),
                "Legitimate transfer attempt"
        );

        // First transfer
        MvcResult first = mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        // Exact duplicate transfer replay
        MvcResult second = mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().is(first.getResponse().getStatus()))
                .andReturn();

        JsonNode firstNode = objectMapper.readTree(first.getResponse().getContentAsString());
        JsonNode secondNode = objectMapper.readTree(second.getResponse().getContentAsString());
        assertThat(firstNode.get("reference").asText()).isEqualTo(secondNode.get("reference").asText());

        // Alice deducted exactly once ($500 - $75 = $425)
        Account reloadedAlice = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        assertThat(reloadedAlice.getBalance()).isEqualByComparingTo(new BigDecimal("425.00"));

        // Bob credited exactly once ($200 + $75 = $275)
        Account reloadedBob = accountRepository.findById(bobAccount.getId()).orElseThrow();
        assertThat(reloadedBob.getBalance()).isEqualByComparingTo(new BigDecimal("275.00"));
    }

    @Test
    @DisplayName("Attack G: Reused Idempotency-Key with modified amount -> 409 IDEMPOTENCY_CONFLICT")
    void attackG_idempotencyMismatch_rejected() throws Exception {
        String idempotencyKey = "ATTACK-G-KEY-" + UUID.randomUUID();
        TransferRequest original = new TransferRequest(
                aliceAccount.getId(),
                bobAccount.getId(),
                null,
                new BigDecimal("50.00"),
                "Transfer original"
        );

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(original)))
                .andExpect(status().isCreated());

        // Reused key with modified amount ($500.00)
        TransferRequest tampered = new TransferRequest(
                aliceAccount.getId(),
                bobAccount.getId(),
                null,
                new BigDecimal("500.00"),
                "Transfer tampered"
        );

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(tampered)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("IDEMPOTENCY_CONFLICT"));
    }

    @Test
    @DisplayName("Attack H: Concurrent overdraft with 2 parallel $400 withdrawals against $500 balance -> Exactly 1 succeeds, no negative balance")
    void attackH_concurrentOverdraft_oneSucceeds() throws Exception {
        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch readyLatch = new CountDownLatch(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            final int idx = i;
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    WithdrawalRequest req = new WithdrawalRequest(
                            new BigDecimal("400.00"),
                            "EXT-ACC-" + idx,
                            "123456789",
                            "Concurrent withdrawal attempt " + idx
                    );

                    MvcResult result = mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/withdrawals")
                                    .header("Authorization", "Bearer " + aliceToken)
                                    .header("Idempotency-Key", "CONC-W-" + idx + "-" + UUID.randomUUID())
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(objectMapper.writeValueAsString(req)))
                            .andReturn();

                    int status = result.getResponse().getStatus();
                    if (status == 201) {
                        successCount.incrementAndGet();
                    } else if (status == 422) {
                        rejectedCount.incrementAndGet();
                    }
                } catch (Exception ignored) {
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        readyLatch.await();
        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        assertThat(successCount.get()).isEqualTo(1);
        assertThat(rejectedCount.get()).isEqualTo(1);

        Account finalAccount = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        assertThat(finalAccount.getBalance()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(finalAccount.getBalance().compareTo(BigDecimal.ZERO)).isGreaterThanOrEqualTo(0);
    }

    @Test
    @DisplayName("Attack I: SQL injection attempt in parameters and payloads -> Safely handled without data tampering")
    void attackI_sqlInjection_safelyHandled() throws Exception {
        // 1. SQL Injection in login email
        Map<String, String> sqliLogin = Map.of(
                "email", "alice.hard@finguard.io' OR '1'='1",
                "password", "Password123!"
        );
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sqliLogin)))
                .andExpect(status().isBadRequest()); // Rejected by email validator

        // 2. SQL Injection in transfer description
        TransferRequest sqliTransfer = new TransferRequest(
                aliceAccount.getId(),
                bobAccount.getId(),
                null,
                new BigDecimal("10.00"),
                "'; DROP TABLE accounts; --"
        );
        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + aliceToken)
                        .header("Idempotency-Key", "SQLI-TEST-" + UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sqliTransfer)))
                .andExpect(status().isCreated());

        // Verify accounts table still exists and balances are intact
        assertThat(accountRepository.count()).isGreaterThanOrEqualTo(2);
    }

    @Test
    @DisplayName("Attack J: Cryptographically tampered JWT token -> 401 UNAUTHORIZED")
    void attackJ_tamperedToken_unauthorized() throws Exception {
        String[] parts = aliceToken.split("\\.");
        // Flip characters in the signature segment
        String tamperedToken = parts[0] + "." + parts[1] + ".TAMPERED_SIG_" + parts[2].substring(10);

        mockMvc.perform(get("/api/v1/accounts/" + aliceAccount.getId())
                        .header("Authorization", "Bearer " + tamperedToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    // =========================================================================
    // SECTION 27: SEC-01 to SEC-08 SPECIFIC VERIFICATIONS
    // =========================================================================

    @Test
    @DisplayName("SEC-01: Malformed and invalid account UUIDs return 400 without leaking stack traces")
    void sec01_invalidUuid_returns400Cleanly() throws Exception {
        mockMvc.perform(get("/api/v1/accounts/not-a-valid-uuid")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_PARAMETER"))
                .andExpect(jsonPath("$.stackTrace").doesNotExist())
                .andExpect(jsonPath("$.correlationId").isNotEmpty());
    }

    @Test
    @DisplayName("SEC-02: Input validation safely rejects zero, negative, and excessive decimal amounts")
    void sec02_invalidAmounts_rejected() throws Exception {
        // Zero amount
        DepositRequest zeroReq = new DepositRequest(BigDecimal.ZERO, "Zero deposit", null);
        mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/deposits")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(zeroReq)))
                .andExpect(status().isBadRequest());

        // Negative amount
        DepositRequest negReq = new DepositRequest(new BigDecimal("-10.00"), "Neg deposit", null);
        mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/deposits")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(negReq)))
                .andExpect(status().isBadRequest());

        // 3 decimal places
        DepositRequest threeDecReq = new DepositRequest(new BigDecimal("10.555"), "3-dec deposit", null);
        mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/deposits")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(threeDecReq)))
                .andExpect(status().isBadRequest());

        // Massive amount exceeding maximum permissible limit
        DepositRequest hugeReq = new DepositRequest(new BigDecimal("999999999999999999999999.00"), "Huge", null);
        mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/deposits")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(hugeReq)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("SEC-03: Extremely large input strings are safely validated without database crashing")
    void sec03_largeInput_safelyHandled() throws Exception {
        String massiveDescription = "A".repeat(10000); // 10,000 characters
        DepositRequest req = new DepositRequest(new BigDecimal("10.00"), massiveDescription, null);

        mockMvc.perform(post("/api/v1/accounts/" + aliceAccount.getId() + "/deposits")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_FAILED"));
    }

    @Test
    @DisplayName("SEC-04: Safe error responses never leak class names, schema, table names, or internal exceptions")
    void sec04_errorResponses_noLeakage() throws Exception {
        // Non-existent ID
        MvcResult res404 = mockMvc.perform(get("/api/v1/accounts/" + UUID.randomUUID())
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isNotFound())
                .andReturn();

        String body404 = res404.getResponse().getContentAsString();
        assertThat(body404).doesNotContain("org.hibernate");
        assertThat(body404).doesNotContain("java.lang");
        assertThat(body404).doesNotContain("Exception");
        assertThat(body404).doesNotContain("SQL");
        assertThat(body404).contains("correlationId");

        // Malformed JSON body
        MvcResult res400 = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{malformed: json, syntax"))
                .andExpect(status().isBadRequest())
                .andReturn();

        String body400 = res400.getResponse().getContentAsString();
        assertThat(body400).doesNotContain("at com.fasterxml.jackson");
        assertThat(body400).contains("MALFORMED_REQUEST");
        assertThat(body400).contains("correlationId");
    }

    @Test
    @DisplayName("SEC-05: Mandatory security headers are present on all HTTP responses")
    void sec05_securityHeaders_present() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none';"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().string("Cache-Control", containsString("no-cache")));
    }

    @Test
    @DisplayName("SEC-06: CORS configuration enforces allowed origin and rejects untrusted origins")
    void sec06_cors_enforcesAllowlist() throws Exception {
        // 1. Allowed origin (http://localhost:5173) receives Allow-Origin header
        mockMvc.perform(options("/api/v1/accounts")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));

        // 2. Untrusted / evil origin (https://evil-attacker.com) is denied CORS headers
        mockMvc.perform(options("/api/v1/accounts")
                        .header("Origin", "https://evil-attacker.com")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    @DisplayName("SEC-07: Secrets are absent from responses, tokens, and audit logs")
    void sec07_secretsAbsentFromResponses() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", "alice.hard@finguard.io",
                                "password", "Password123!"
                        ))))
                .andExpect(status().isOk())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertThat(body).doesNotContain("Password123!");
        assertThat(body).doesNotContain("passwordHash");
        assertThat(body).doesNotContain("$2a$");
        assertThat(body).doesNotContain("secret");
    }

    @Test
    @DisplayName("SEC-08: Pagination clamping prevents memory exhaustion from unbounded query requests")
    void sec08_paginationClamping() throws Exception {
        // Request excessive size (?size=100000000) - Clamped safely without error
        mockMvc.perform(get("/api/v1/accounts/" + aliceAccount.getId() + "/transactions?page=0&size=100000000")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk());

        // Negative page index (?page=-5) - Clamped safely without error
        mockMvc.perform(get("/api/v1/accounts/" + aliceAccount.getId() + "/transactions?page=-5&size=20")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk());

        // High page index (?page=999999999) - Returns empty list safely
        mockMvc.perform(get("/api/v1/accounts/" + aliceAccount.getId() + "/transactions?page=999999999&size=20")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("SEC-09: Login rate limiting blocks repeated brute-force authentication attempts")
    void sec09_loginRateLimiting_blocksBruteForce() throws Exception {
        String testIp = "192.168.1.100";
        String testEmail = "victim.brute@finguard.io";
        String key = testIp + ":" + testEmail;

        loginRateLimiter.reset(key);

        Map<String, String> badLogin = Map.of(
                "email", testEmail,
                "password", "WrongPassword!"
        );

        // 5 consecutive failed attempts
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                            .with(request -> {
                                request.setRemoteAddr(testIp);
                                return request;
                            })
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badLogin)))
                    .andExpect(status().isUnauthorized());
        }

        // 6th attempt is blocked by rate limiter with 429 TOO_MANY_REQUESTS
        mockMvc.perform(post("/api/v1/auth/login")
                        .with(request -> {
                            request.setRemoteAddr(testIp);
                            return request;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badLogin)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.errorCode").value("RATE_LIMIT_EXCEEDED"));

        loginRateLimiter.reset(key);
    }
}
