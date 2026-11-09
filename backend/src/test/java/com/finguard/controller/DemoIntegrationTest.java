package com.finguard.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finguard.dto.TransferRequest;
import com.finguard.entity.Account;
import com.finguard.entity.AccountType;
import com.finguard.entity.Role;
import com.finguard.entity.User;
import com.finguard.repository.AccountRepository;
import com.finguard.repository.UserRepository;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Public Demo Account & Sandbox Isolation Integration Tests")
public class DemoIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final UUID DEMO_CHECKING_ID = UUID.fromString("00000000-0000-0000-0000-000000000011");
    private static final UUID DEMO_SAVINGS_ID = UUID.fromString("00000000-0000-0000-0000-000000000012");
    private static final UUID DEMO_ESCROW_ID = UUID.fromString("00000000-0000-0000-0000-000000000013");

    @Test
    @DisplayName("1. Public Demo Login issues valid JWT with DEMO_USER role without credentials")
    void testDemoLoginWithoutCredentials() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.email").value("demo@finguard.app"))
                .andExpect(jsonPath("$.user.name").value("Alex Morgan"))
                .andExpect(jsonPath("$.user.role").value("DEMO_USER"))
                .andReturn();

        String token = objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
        assertThat(token).isNotBlank();
    }

    @Test
    @DisplayName("2. Demo User retrieves 3 accounts with exactly $245,800.00 consolidated balance")
    void testDemoAccountsAndConsolidatedBalance() throws Exception {
        String token = getDemoToken();

        MvcResult result = mockMvc.perform(get("/api/v1/accounts")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode accounts = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(accounts.isArray()).isTrue();
        assertThat(accounts.size()).isEqualTo(3);

        BigDecimal total = BigDecimal.ZERO;
        for (JsonNode acc : accounts) {
            BigDecimal bal = new BigDecimal(acc.get("balance").asText());
            total = total.add(bal);
        }

        assertThat(total.setScale(2, RoundingMode.HALF_UP))
                .isEqualByComparingTo(new BigDecimal("245800.00"));
    }

    @Test
    @DisplayName("3. Demo User retrieves 12 synthetic transactions with balanced double-entry ledger")
    void testDemoTransactionHistory() throws Exception {
        String token = getDemoToken();

        MvcResult result = mockMvc.perform(get("/api/v1/transactions")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode txs = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(txs.isArray()).isTrue();
        assertThat(txs.size()).isGreaterThanOrEqualTo(12);

        // Verify transaction details endpoint and double-entry balance for baseline tx
        UUID firstTxId = UUID.fromString(txs.get(0).get("id").asText());
        mockMvc.perform(get("/api/v1/transactions/" + firstTxId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isBalanced").value(true))
                .andExpect(jsonPath("$.ledgerEntries").isArray());
    }

    @Test
    @DisplayName("4. Strict Isolation: Demo User CANNOT access normal user accounts")
    void testDemoCannotAccessNormalUserAccount() throws Exception {
        // Create normal user & account
        User normalUser = createTestUser("normal_user_isolation@test.com", "Normal User", Role.ACCOUNT_HOLDER);
        Account normalAcc = createTestAccount(normalUser, "NORM-CHK-001", AccountType.CHECKING, new BigDecimal("5000.00"));

        String demoToken = getDemoToken();

        // Attempt IDOR read of normal user's account
        mockMvc.perform(get("/api/v1/accounts/" + normalAcc.getId())
                        .header("Authorization", "Bearer " + demoToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("5. Strict Isolation: Normal User CANNOT access demo accounts")
    void testNormalUserCannotAccessDemoAccount() throws Exception {
        getDemoToken(); // ensure demo environment is provisioned
        User normalUser = createTestUser("normal_reader@test.com", "Normal Reader", Role.ACCOUNT_HOLDER);
        String normalToken = getJwtTokenForUser(normalUser);

        // Attempt IDOR read of demo checking account
        mockMvc.perform(get("/api/v1/accounts/" + DEMO_CHECKING_ID)
                        .header("Authorization", "Bearer " + normalToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("6. Strict Isolation: Normal User CANNOT transfer funds to a demo account")
    void testNormalUserCannotTransferToDemoAccount() throws Exception {
        getDemoToken(); // ensure demo environment is provisioned
        User normalUser = createTestUser("normal_sender@test.com", "Normal Sender", Role.ACCOUNT_HOLDER);
        Account normalAcc = createTestAccount(normalUser, "NORM-SND-001", AccountType.CHECKING, new BigDecimal("10000.00"));
        String normalToken = getJwtTokenForUser(normalUser);

        TransferRequest request = new TransferRequest(
                normalAcc.getId(),
                DEMO_CHECKING_ID,
                null,
                new BigDecimal("500.00"),
                "Prohibited transfer to demo"
        );

        mockMvc.perform(post("/api/v1/transactions/transfer")
                        .header("Authorization", "Bearer " + normalToken)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("7. Strict Isolation: Demo User CANNOT transfer funds to a normal user account")
    void testDemoCannotTransferToNormalAccount() throws Exception {
        User normalUser = createTestUser("normal_recipient@test.com", "Normal Recipient", Role.ACCOUNT_HOLDER);
        Account normalAcc = createTestAccount(normalUser, "NORM-RCP-001", AccountType.CHECKING, new BigDecimal("10000.00"));

        String demoToken = getDemoToken();

        TransferRequest request = new TransferRequest(
                DEMO_CHECKING_ID,
                normalAcc.getId(),
                null,
                new BigDecimal("500.00"),
                "Prohibited transfer to normal account"
        );

        mockMvc.perform(post("/api/v1/transactions/transfer")
                        .header("Authorization", "Bearer " + demoToken)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("8. Demo Transfer: Demo user CAN execute simulated transfers between demo accounts")
    void testDemoCanTransferBetweenDemoAccounts() throws Exception {
        String demoToken = getDemoToken();

        TransferRequest request = new TransferRequest(
                DEMO_CHECKING_ID,
                DEMO_SAVINGS_ID,
                null,
                new BigDecimal("200.00"),
                "Simulated Sandbox Transfer"
        );

        mockMvc.perform(post("/api/v1/transactions/transfer")
                        .header("Authorization", "Bearer " + demoToken)
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    @DisplayName("9. Demo Reset: Restores demo balances to baseline ($245,800.00) & 12 transactions")
    void testDemoResetRestoresBaseline() throws Exception {
        String demoToken = getDemoToken();

        // 1. Reset demo environment
        mockMvc.perform(post("/api/v1/demo/reset")
                        .header("Authorization", "Bearer " + demoToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.totalBalance").value(245800.00))
                .andExpect(jsonPath("$.accountsCount").value(3))
                .andExpect(jsonPath("$.transactionsCount").value(12));

        // 2. Verify account balances restored
        MvcResult accResult = mockMvc.perform(get("/api/v1/accounts")
                        .header("Authorization", "Bearer " + demoToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode accounts = objectMapper.readTree(accResult.getResponse().getContentAsString());
        assertThat(accounts.size()).isEqualTo(3);

        BigDecimal total = BigDecimal.ZERO;
        for (JsonNode a : accounts) {
            total = total.add(new BigDecimal(a.get("balance").asText()));
        }
        assertThat(total).isEqualByComparingTo(new BigDecimal("245800.00"));
    }

    @Test
    @DisplayName("10. Demo Reset Security: Unauthorized or normal users cannot invoke reset")
    void testUnauthorizedDemoResetRejected() throws Exception {
        // Unauthenticated -> 401
        mockMvc.perform(post("/api/v1/demo/reset"))
                .andExpect(status().isUnauthorized());

        // Normal ACCOUNT_HOLDER -> 403
        User normalUser = createTestUser("normal_reset_attacker@test.com", "Attacker", Role.ACCOUNT_HOLDER);
        String normalToken = getJwtTokenForUser(normalUser);

        mockMvc.perform(post("/api/v1/demo/reset")
                        .header("Authorization", "Bearer " + normalToken))
                .andExpect(status().isForbidden());
    }

    private String getDemoToken() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/demo"))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    private User createTestUser(String email, String name, Role role) {
        return userRepository.findByEmail(email).orElseGet(() -> {
            User u = new User(name, email, passwordEncoder.encode("Password123!"), role);
            u.setEnabled(true);
            return userRepository.save(u);
        });
    }

    private Account createTestAccount(User user, String number, AccountType type, BigDecimal balance) {
        return accountRepository.findByAccountNumber(number).orElseGet(() -> {
            Account acc = new Account(user, number, type, "USD");
            acc.setBalance(balance);
            acc.setAvailableBalance(balance);
            acc.setDailyLimit(new BigDecimal("250000.00"));
            return accountRepository.save(acc);
        });
    }

    @Autowired
    private com.finguard.security.JwtService jwtService;

    private String getJwtTokenForUser(User user) {
        return jwtService.generateToken(user);
    }
}

