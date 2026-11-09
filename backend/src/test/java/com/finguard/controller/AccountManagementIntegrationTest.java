package com.finguard.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finguard.dto.AccountResponse;
import com.finguard.dto.CreateAccountRequest;
import com.finguard.entity.Account;
import com.finguard.entity.AccountStatus;
import com.finguard.entity.AccountType;
import com.finguard.entity.Role;
import com.finguard.entity.User;
import com.finguard.repository.AccountRepository;
import com.finguard.repository.UserRepository;
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
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AccountManagementIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

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
        accountRepository.deleteAll();
        userRepository.deleteAll();

        alice = userRepository.save(new User(
                "Alice Commercial",
                "alice.mgmt@finguard.io",
                passwordEncoder.encode("SecurePass123!"),
                Role.ACCOUNT_HOLDER
        ));

        bob = userRepository.save(new User(
                "Bob Enterprise",
                "bob.mgmt@finguard.io",
                passwordEncoder.encode("SecurePass456!"),
                Role.ACCOUNT_HOLDER
        ));

        aliceToken = jwtService.generateToken(alice);
        bobToken = jwtService.generateToken(bob);

        Account accAlice = new Account(alice, "ACC-ALICE-8888", AccountType.CHECKING, "USD");
        accAlice.setBalance(new BigDecimal("1500.00").setScale(2, RoundingMode.HALF_UP));
        accAlice.setAvailableBalance(new BigDecimal("1500.00").setScale(2, RoundingMode.HALF_UP));
        aliceAccount = accountRepository.save(accAlice);

        Account accBob = new Account(bob, "ACC-BOB-9999", AccountType.SAVINGS, "USD");
        accBob.setBalance(new BigDecimal("3000.00").setScale(2, RoundingMode.HALF_UP));
        accBob.setAvailableBalance(new BigDecimal("3000.00").setScale(2, RoundingMode.HALF_UP));
        bobAccount = accountRepository.save(accBob);
    }

    @Test
    @DisplayName("AUTHZ-01: Authenticated user can access their own account details")
    void userCanAccessOwnAccount() throws Exception {
        mockMvc.perform(get("/api/v1/accounts/" + aliceAccount.getId())
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(aliceAccount.getId().toString())))
                .andExpect(jsonPath("$.accountNumber", is("ACC-ALICE-8888")))
                .andExpect(jsonPath("$.accountType", is("CHECKING")))
                .andExpect(jsonPath("$.currency", is("USD")))
                .andExpect(jsonPath("$.balance", is(1500.00)))
                .andExpect(jsonPath("$.status", is("ACTIVE")))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    @DisplayName("AUTHZ-02: Authenticated user cannot access another user's account (IDOR / BOLA defense)")
    void userCannotAccessAnotherUsersAccount() throws Exception {
        // Alice attempts to access Bob's account using Bob's account ID
        mockMvc.perform(get("/api/v1/accounts/" + bobAccount.getId())
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error", is("ACCESS_DENIED")))
                .andExpect(jsonPath("$.message", containsString("permission")))
                .andExpect(jsonPath("$.correlationId", notNullValue()));
    }

    @Test
    @DisplayName("AUTHZ-03: Account listing does not expose another user's accounts")
    void accountListingReturnsOnlyOwnedAccounts() throws Exception {
        // Alice requests account listing
        mockMvc.perform(get("/api/v1/accounts")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is(aliceAccount.getId().toString())))
                .andExpect(jsonPath("$[0].accountNumber", is("ACC-ALICE-8888")))
                // Ensure Bob's account is NOT leaked in Alice's result set
                .andExpect(jsonPath("$[*].id", not(hasItem(bobAccount.getId().toString()))))
                .andExpect(jsonPath("$[*].accountNumber", not(hasItem("ACC-BOB-9999"))));

        // Bob requests account listing
        mockMvc.perform(get("/api/v1/accounts")
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is(bobAccount.getId().toString())))
                .andExpect(jsonPath("$[0].accountNumber", is("ACC-BOB-9999")));
    }

    @Test
    @DisplayName("AUTHZ-04: Unauthenticated account access returns 401 Unauthorized")
    void unauthenticatedAccountAccessReturns401() throws Exception {
        // Unauthenticated listing
        mockMvc.perform(get("/api/v1/accounts"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", is("UNAUTHORIZED")));

        // Unauthenticated detail
        mockMvc.perform(get("/api/v1/accounts/" + aliceAccount.getId()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", is("UNAUTHORIZED")));

        // Unauthenticated creation
        mockMvc.perform(post("/api/v1/accounts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", is("UNAUTHORIZED")));
    }

    @Test
    @DisplayName("AUTHZ-05: Unauthorized role cannot access restricted administrative functions")
    void unauthorizedRoleReturns403() throws Exception {
        // Account holder Alice calls admin user list endpoint -> 403 Forbidden
        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error", is("ACCESS_DENIED")));
    }

    @Test
    @DisplayName("AUTHZ-06: Client cannot assign another owner during account creation")
    void clientCannotAssignAnotherOwner() throws Exception {
        // Alice attempts to specify Bob's UUID as ownerId/userId in request body
        String payload = "{" +
                "\"accountType\": \"SAVINGS\"," +
                "\"currency\": \"USD\"," +
                "\"ownerId\": \"" + bob.getId() + "\"," +
                "\"userId\": \"" + bob.getId() + "\"" +
                "}";

        MvcResult result = mockMvc.perform(post("/api/v1/accounts")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accountType", is("SAVINGS")))
                .andExpect(jsonPath("$.currency", is("USD")))
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        UUID createdAccountId = UUID.fromString(root.get("id").asText());

        // Verify in database that account was bound to ALICE (authenticated user), NOT Bob
        Account savedAccount = accountRepository.findById(createdAccountId).orElseThrow();
        assertThat(savedAccount.getUser().getId()).isEqualTo(alice.getId());
        assertThat(savedAccount.getUser().getId()).isNotEqualTo(bob.getId());
    }

    @Test
    @DisplayName("AUTHZ-07: Client cannot assign a role during account creation")
    void clientCannotAssignRoleDuringAccountCreation() throws Exception {
        String payload = "{" +
                "\"accountType\": \"CHECKING\"," +
                "\"role\": \"ADMINISTRATOR\"" +
                "}";

        mockMvc.perform(post("/api/v1/accounts")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated());

        // Alice's role in DB remains ACCOUNT_HOLDER
        User refreshedAlice = userRepository.findById(alice.getId()).orElseThrow();
        assertThat(refreshedAlice.getRole()).isEqualTo(Role.ACCOUNT_HOLDER);
    }

    @Test
    @DisplayName("AUTHZ-08: Client cannot set the account balance during account creation (zero-creation invariant)")
    void clientCannotSetBalanceDuringCreation() throws Exception {
        // Attacker attempts to create money by submitting fake balance values
        String payload = "{" +
                "\"accountType\": \"CHECKING\"," +
                "\"currency\": \"USD\"," +
                "\"balance\": 10000000.00," +
                "\"availableBalance\": 10000000.00" +
                "}";

        MvcResult result = mockMvc.perform(post("/api/v1/accounts")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.balance", is(0.00)))
                .andExpect(jsonPath("$.availableBalance", is(0.00)))
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        UUID createdAccountId = UUID.fromString(root.get("id").asText());

        Account saved = accountRepository.findById(createdAccountId).orElseThrow();
        assertThat(saved.getBalance()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(saved.getAvailableBalance()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("INR-01: Authenticated user can create an internal INR financial account")
    void userCanCreateInrAccount() throws Exception {
        String payload = "{" +
                "\"accountType\": \"SAVINGS\"," +
                "\"currency\": \"INR\"" +
                "}";

        MvcResult result = mockMvc.perform(post("/api/v1/accounts")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accountType", is("SAVINGS")))
                .andExpect(jsonPath("$.currency", is("INR")))
                .andExpect(jsonPath("$.balance", is(0.00)))
                .andExpect(jsonPath("$.availableBalance", is(0.00)))
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        UUID createdAccountId = UUID.fromString(root.get("id").asText());

        Account savedAccount = accountRepository.findById(createdAccountId).orElseThrow();
        assertThat(savedAccount.getCurrency()).isEqualTo("INR");
        assertThat(savedAccount.getUser().getId()).isEqualTo(alice.getId());
        assertThat(savedAccount.getBalance()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("AUTHZ-09: Client cannot manipulate account status during account creation")
    void clientCannotManipulateStatusDuringCreation() throws Exception {
        String payload = "{" +
                "\"accountType\": \"CHECKING\"," +
                "\"status\": \"FROZEN\"" +
                "}";

        MvcResult result = mockMvc.perform(post("/api/v1/accounts")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("ACTIVE")))
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        UUID createdAccountId = UUID.fromString(root.get("id").asText());

        Account saved = accountRepository.findById(createdAccountId).orElseThrow();
        assertThat(saved.getStatus()).isEqualTo(AccountStatus.ACTIVE);
    }

    @Test
    @DisplayName("SEC-01: Malformed account UUID is handled safely with 400 INVALID_PARAMETER, not 500")
    void malformedAccountIdHandledSafely() throws Exception {
        mockMvc.perform(get("/api/v1/accounts/not-a-valid-uuid-string")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", is("INVALID_PARAMETER")))
                .andExpect(jsonPath("$.correlationId", notNullValue()));
    }

    @Test
    @DisplayName("SEC-02: Non-existent account ID returns 404 RESOURCE_NOT_FOUND")
    void nonExistentAccountIdReturns404() throws Exception {
        UUID randomId = UUID.randomUUID();
        mockMvc.perform(get("/api/v1/accounts/" + randomId)
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", is("RESOURCE_NOT_FOUND")))
                .andExpect(jsonPath("$.correlationId", notNullValue()));
    }

    @Test
    @DisplayName("SEC-03: Disabled user cannot create accounts or access account management")
    void disabledUserCannotAccessAccounts() throws Exception {
        alice.setEnabled(false);
        userRepository.save(alice);

        // Account creation blocked
        mockMvc.perform(post("/api/v1/accounts")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());

        // Account listing blocked
        mockMvc.perform(get("/api/v1/accounts")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("SEC-04: Server generates non-guessable, collision-free account numbers")
    void serverGeneratesUniqueNonGuessableAccountNumbers() throws Exception {
        MvcResult res1 = mockMvc.perform(post("/api/v1/accounts")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accountType\":\"CHECKING\"}"))
                .andExpect(status().isCreated())
                .andReturn();

        MvcResult res2 = mockMvc.perform(post("/api/v1/accounts")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accountType\":\"SAVINGS\"}"))
                .andExpect(status().isCreated())
                .andReturn();

        String num1 = objectMapper.readTree(res1.getResponse().getContentAsString()).get("accountNumber").asText();
        String num2 = objectMapper.readTree(res2.getResponse().getContentAsString()).get("accountNumber").asText();

        assertThat(num1).startsWith("ACC-");
        assertThat(num2).startsWith("ACC-");
        assertThat(num1).isNotEqualTo(num2);
    }
}

