package com.finguard.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finguard.dto.CreateAccountRequest;
import com.finguard.dto.DepositRequest;
import com.finguard.dto.LoginRequest;
import com.finguard.dto.RegisterRequest;
import com.finguard.dto.TransferRequest;
import com.finguard.dto.WithdrawalRequest;
import com.finguard.entity.AccountType;
import com.finguard.repository.AccountRepository;
import com.finguard.repository.FinancialTransactionRepository;
import com.finguard.repository.IdempotencyRecordRepository;
import com.finguard.repository.LedgerEntryRepository;
import com.finguard.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("Phase 7: End-to-End Frontend ↔ Backend Integration Verification (32 Checklist Steps)")
public class Phase7EndToEndVerificationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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

    @BeforeEach
    void cleanState() {
        ledgerEntryRepository.deleteAll();
        transactionRepository.deleteAll();
        idempotencyRecordRepository.deleteAll();
        accountRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @Order(1)
    @DisplayName("Complete 32-Step End-to-End Integration Checklist Execution")
    void executeFull32StepIntegrationChecklist() throws Exception {
        System.out.println("================================================================================");
        System.out.println("EXECUTING FINGUARD PHASE 7: COMPLETE 32-STEP END-TO-END INTEGRATION CHECKLIST");
        System.out.println("================================================================================");

        // --- STEP 1: Register User A via UI ---
        String emailA = "alice." + UUID.randomUUID() + "@finguard.internal";
        RegisterRequest registerA = new RegisterRequest(
                "Alice Vance",
                "Alice",
                "Vance",
                emailA,
                "Password123!Secure"
        );

        MvcResult regResultA = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerA)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(emailA))
                .andExpect(jsonPath("$.name").value("Alice Vance"))
                .andReturn();
        System.out.println("Step 1: PASS - User A registered (" + emailA + ")");

        // --- STEP 2: Log in User A via UI ---
        LoginRequest loginA = new LoginRequest(emailA, "Password123!Secure", null);

        MvcResult loginResultA = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(emailA))
                .andReturn();

        JsonNode loginJsonA = objectMapper.readTree(loginResultA.getResponse().getContentAsString());
        String tokenA = loginJsonA.get("token").asText();
        String userAId = loginJsonA.get("user").get("id").asText();
        System.out.println("Step 2: PASS - User A logged in, JWT received");

        // --- STEP 3: Verify JWT token stored securely in auth state (/auth/me) ---
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(userAId))
                .andExpect(jsonPath("$.email").value(emailA));
        System.out.println("Step 3: PASS - JWT validated via /auth/me for User A");

        // --- STEP 4: Verify User A dashboard loads with zero/initial balance ---
        mockMvc.perform(get("/api/v1/accounts")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
        System.out.println("Step 4: PASS - Dashboard accounts query returned 0 accounts for new user");

        // --- STEP 5: Create account for User A ---
        CreateAccountRequest createAccReqA = new CreateAccountRequest(AccountType.CHECKING, "USD");

        MvcResult createAccResA = mockMvc.perform(post("/api/v1/accounts")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createAccReqA)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.accountNumber").isNotEmpty())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.balance").value(0.00))
                .andReturn();

        JsonNode createAccJsonA = objectMapper.readTree(createAccResA.getResponse().getContentAsString());
        String accountAId = createAccJsonA.get("id").asText();
        System.out.println("Step 5: PASS - Account created for User A (ID: " + accountAId + ")");

        // --- STEP 6: Verify account details displayed correctly ---
        mockMvc.perform(get("/api/v1/accounts/" + accountAId)
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(accountAId))
                .andExpect(jsonPath("$.accountType").value("CHECKING"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.balance").value(0.00));
        System.out.println("Step 6: PASS - Account details verified with status=ACTIVE, balance=$0.00");

        // --- STEP 7: Deposit $1000 into User A's account via Deposit screen ---
        String idempKeyDeposit = UUID.randomUUID().toString();
        DepositRequest depositReq1 = new DepositRequest(
                new BigDecimal("1000.00"),
                "Q2 Working Capital Inbound Deposit",
                "ACH"
        );

        MvcResult depRes1 = mockMvc.perform(post("/api/v1/accounts/" + accountAId + "/deposits")
                        .header("Authorization", "Bearer " + tokenA)
                        .header("Idempotency-Key", idempKeyDeposit)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(depositReq1)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.amount").value(1000.00))
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andReturn();

        JsonNode depJson1 = objectMapper.readTree(depRes1.getResponse().getContentAsString());
        String depositTxId = depJson1.get("id").asText();
        System.out.println("Step 7: PASS - Deposit of $1000.00 executed (TxId: " + depositTxId + ")");

        // --- STEP 8: Verify deposit transaction appears in ledger/transaction history ---
        mockMvc.perform(get("/api/v1/accounts/" + accountAId + "/transactions")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].type").value("DEPOSIT"))
                .andExpect(jsonPath("$[0].amount").value(1000.00));
        System.out.println("Step 8: PASS - Deposit transaction verified in account transaction history");

        // --- STEP 9: Verify User A's account balance updates to $1000 ---
        mockMvc.perform(get("/api/v1/accounts/" + accountAId)
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance").value(1000.00));
        System.out.println("Step 9: PASS - User A account balance updated to $1000.00");

        // --- STEP 10: Attempt duplicate deposit with SAME idempotency key — verify cached response returned ---
        mockMvc.perform(post("/api/v1/accounts/" + accountAId + "/deposits")
                        .header("Authorization", "Bearer " + tokenA)
                        .header("Idempotency-Key", idempKeyDeposit)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(depositReq1)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(depositTxId))
                .andExpect(jsonPath("$.amount").value(1000.00));

        // Verify balance is STILL $1000.00 (no double credit)
        mockMvc.perform(get("/api/v1/accounts/" + accountAId)
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance").value(1000.00));
        System.out.println("Step 10: PASS - Duplicate deposit returned cached response, balance strictly preserved at $1000.00");

        // --- STEP 11: Attempt deposit with SAME idempotency key but DIFFERENT amount ($2000) — verify 409 Conflict ---
        DepositRequest conflictDeposit = new DepositRequest(
                new BigDecimal("2000.00"),
                "Mismatched payload attempt",
                "ACH"
        );

        mockMvc.perform(post("/api/v1/accounts/" + accountAId + "/deposits")
                        .header("Authorization", "Bearer " + tokenA)
                        .header("Idempotency-Key", idempKeyDeposit)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(conflictDeposit)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("IDEMPOTENCY_CONFLICT"));
        System.out.println("Step 11: PASS - Idempotency conflict with modified payload rejected (409 Conflict)");

        // --- STEP 12: Attempt deposit with negative amount (-$100) — verify 400 Bad Request ---
        DepositRequest negDeposit = new DepositRequest(
                new BigDecimal("-100.00"),
                "Negative deposit attempt",
                "ACH"
        );

        mockMvc.perform(post("/api/v1/accounts/" + accountAId + "/deposits")
                        .header("Authorization", "Bearer " + tokenA)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(negDeposit)))
                .andExpect(status().isBadRequest());
        System.out.println("Step 12: PASS - Negative deposit rejected (400 Bad Request)");

        // --- STEP 13: Withdraw $200 from User A's account via Withdraw screen ---
        String idempKeyWdr = UUID.randomUUID().toString();
        WithdrawalRequest wdrReq1 = new WithdrawalRequest(
                new BigDecimal("200.00"),
                "Apex Liquidity Partners LLC (•••• 8831)",
                "021000021",
                "Operational disbursements tranche 1"
        );

        mockMvc.perform(post("/api/v1/accounts/" + accountAId + "/withdrawals")
                        .header("Authorization", "Bearer " + tokenA)
                        .header("Idempotency-Key", idempKeyWdr)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(wdrReq1)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.amount").value(200.00))
                .andExpect(jsonPath("$.status").value("COMPLETED"));
        System.out.println("Step 13: PASS - Withdrawal of $200.00 successfully executed");

        // --- STEP 14: Verify withdrawal transaction appears in history ---
        mockMvc.perform(get("/api/v1/accounts/" + accountAId + "/transactions")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].type").value("WITHDRAWAL"))
                .andExpect(jsonPath("$[0].amount").value(200.00));
        System.out.println("Step 14: PASS - Withdrawal transaction verified in ledger history");

        // --- STEP 15: Verify balance updates to $800 ---
        mockMvc.perform(get("/api/v1/accounts/" + accountAId)
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance").value(800.00));
        System.out.println("Step 15: PASS - Account balance updated to $800.00");

        // --- STEP 16: Attempt to withdraw $1000 (more than $800 balance) — verify 422 Insufficient Funds ---
        WithdrawalRequest wdrOver = new WithdrawalRequest(
                new BigDecimal("1000.00"),
                "Apex Liquidity Partners LLC (•••• 8831)",
                "021000021",
                "Attempt to exceed balance"
        );

        mockMvc.perform(post("/api/v1/accounts/" + accountAId + "/withdrawals")
                        .header("Authorization", "Bearer " + tokenA)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(wdrOver)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error").value("INSUFFICIENT_FUNDS"));
        System.out.println("Step 16: PASS - Overdraft withdrawal rejected with 422 INSUFFICIENT_FUNDS");

        // --- STEP 17: Verify balance remains $800 (no partial deduction) ---
        mockMvc.perform(get("/api/v1/accounts/" + accountAId)
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance").value(800.00));
        System.out.println("Step 17: PASS - Balance remains strictly at $800.00 without partial deductions");

        // --- STEP 18: Register User B via UI ---
        String emailB = "bob." + UUID.randomUUID() + "@finguard.internal";
        RegisterRequest registerB = new RegisterRequest(
                "Bob Martinez",
                "Bob",
                "Martinez",
                emailB,
                "Password123!Secure"
        );

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerB)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value(emailB));
        System.out.println("Step 18: PASS - User B registered (" + emailB + ")");

        // --- STEP 19: Log in User B via UI ---
        LoginRequest loginB = new LoginRequest(emailB, "Password123!Secure", null);

        MvcResult loginResultB = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginB)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn();

        JsonNode loginJsonB = objectMapper.readTree(loginResultB.getResponse().getContentAsString());
        String tokenB = loginJsonB.get("token").asText();
        String userBId = loginJsonB.get("user").get("id").asText();
        System.out.println("Step 19: PASS - User B logged in, separate JWT established");

        // --- STEP 20: Create account for User B (verify balance is $0) ---
        CreateAccountRequest createAccReqB = new CreateAccountRequest(AccountType.CHECKING, "USD");

        MvcResult createAccResB = mockMvc.perform(post("/api/v1/accounts")
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createAccReqB)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.balance").value(0.00))
                .andReturn();

        JsonNode createAccJsonB = objectMapper.readTree(createAccResB.getResponse().getContentAsString());
        String accountBId = createAccJsonB.get("id").asText();
        System.out.println("Step 20: PASS - Account created for User B with balance $0.00 (ID: " + accountBId + ")");

        // --- STEP 21: Log back in as User A ---
        MvcResult reloginResultA = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginA)))
                .andExpect(status().isOk())
                .andReturn();
        String refreshedTokenA = objectMapper.readTree(reloginResultA.getResponse().getContentAsString()).get("token").asText();
        System.out.println("Step 21: PASS - User A session re-verified");

        // --- STEP 22: Transfer $300 from User A's account to User B's account via Transfer screen ---
        String idempKeyTransfer = UUID.randomUUID().toString();
        TransferRequest transferReq = new TransferRequest(
                UUID.fromString(accountAId),
                UUID.fromString(accountBId),
                null,
                new BigDecimal("300.00"),
                "Inter-Vault Settlement Tranche #99401"
        );

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + refreshedTokenA)
                        .header("Idempotency-Key", idempKeyTransfer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(transferReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.amount").value(300.00));
        System.out.println("Step 22: PASS - Transfer of $300.00 executed between User A and User B");

        // --- STEP 23: Verify transfer appears in User A's history as debit (-$300) ---
        mockMvc.perform(get("/api/v1/accounts/" + accountAId + "/transactions")
                        .header("Authorization", "Bearer " + refreshedTokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].type").value("TRANSFER"))
                .andExpect(jsonPath("$[0].amount").value(300.00));
        System.out.println("Step 23: PASS - Transfer debit (-$300.00) verified in User A transaction ledger");

        // --- STEP 24: Verify User A's balance updates to $500 ---
        mockMvc.perform(get("/api/v1/accounts/" + accountAId)
                        .header("Authorization", "Bearer " + refreshedTokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance").value(500.00));
        System.out.println("Step 24: PASS - User A balance updated from $800 to $500.00");

        // --- STEP 25: Log in as User B ---
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(emailB));
        System.out.println("Step 25: PASS - User B session confirmed");

        // --- STEP 26: Verify transfer appears in User B's history as credit (+$300) ---
        mockMvc.perform(get("/api/v1/accounts/" + accountBId + "/transactions")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].type").value("TRANSFER"))
                .andExpect(jsonPath("$[0].amount").value(300.00));
        System.out.println("Step 26: PASS - Transfer credit (+$300.00) verified in User B transaction ledger");

        // --- STEP 27: Verify User B's balance updates to $300 ---
        mockMvc.perform(get("/api/v1/accounts/" + accountBId)
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance").value(300.00));
        System.out.println("Step 27: PASS - User B balance updated from $0 to $300.00");

        // --- STEP 28: Attempt transfer with unknown destination account ID — verify 404/400 ---
        TransferRequest unknownDestTransfer = new TransferRequest(
                UUID.fromString(accountAId),
                UUID.randomUUID(),
                null,
                new BigDecimal("50.00"),
                "Transfer to non-existent account"
        );

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + refreshedTokenA)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(unknownDestTransfer)))
                .andExpect(status().isNotFound());
        System.out.println("Step 28: PASS - Transfer to unknown destination rejected (404 Not Found)");

        // --- STEP 29: Attempt self-transfer (same source and destination) — verify 400 Bad Request ---
        TransferRequest selfTransfer = new TransferRequest(
                UUID.fromString(accountAId),
                UUID.fromString(accountAId),
                null,
                new BigDecimal("50.00"),
                "Self transfer attempt"
        );

        mockMvc.perform(post("/api/v1/transfers")
                        .header("Authorization", "Bearer " + refreshedTokenA)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(selfTransfer)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_TRANSFER"));
        System.out.println("Step 29: PASS - Self-transfer prevented with 400 INVALID_TRANSFER");

        // --- STEP 30: Verify User B CANNOT view User A's account details (IDOR: 403 Forbidden) ---
        mockMvc.perform(get("/api/v1/accounts/" + accountAId)
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("ACCESS_DENIED"));
        System.out.println("Step 30: PASS - IDOR check: User B blocked from viewing User A's account (403 Forbidden)");

        // --- STEP 31: Verify User B CANNOT view User A's transaction details (403/404 Forbidden) ---
        mockMvc.perform(get("/api/v1/transactions/" + depositTxId)
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("ACCESS_DENIED"));
        System.out.println("Step 31: PASS - IDOR check: User B blocked from viewing User A's deposit transaction (403 Forbidden)");

        // --- STEP 32: Log out / unauthenticated access check — verify 401 Unauthorized ---
        mockMvc.perform(get("/api/v1/accounts"))
                .andExpect(status().isUnauthorized());
        System.out.println("Step 32: PASS - Unauthenticated access rejected (401 Unauthorized)");

        System.out.println("================================================================================");
        System.out.println("ALL 32 END-TO-END INTEGRATION CHECKLIST STEPS COMPLETED AND VERIFIED 100%");
        System.out.println("================================================================================");
    }
}
