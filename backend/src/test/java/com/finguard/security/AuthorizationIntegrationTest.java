package com.finguard.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finguard.dto.RegisterRequest;
import com.finguard.entity.Account;
import com.finguard.entity.AccountType;
import com.finguard.entity.Role;
import com.finguard.entity.User;
import com.finguard.repository.AccountRepository;
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

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthorizationIntegrationTest {

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

    private User accountHolderUser;
    private User adminUser;
    private User auditorUser;
    private Account accountHolderAccount;

    @BeforeEach
    void setUp() {
        accountRepository.deleteAll();
        userRepository.deleteAll();

        accountHolderUser = userRepository.save(new User(
                "Alice Holder",
                "alice.holder@finguard.io",
                passwordEncoder.encode("SecretPass123!"),
                Role.ACCOUNT_HOLDER
        ));

        adminUser = userRepository.save(new User(
                "Adam Admin",
                "adam.admin@finguard.io",
                passwordEncoder.encode("AdminSecret123!"),
                Role.ADMINISTRATOR
        ));

        auditorUser = userRepository.save(new User(
                "Audrey Auditor",
                "audrey.auditor@finguard.io",
                passwordEncoder.encode("AuditSecret123!"),
                Role.AUDITOR
        ));

        Account aliceAcc = new Account(
                accountHolderUser,
                "ACC-ALICE-1001",
                AccountType.CHECKING,
                "USD"
        );
        aliceAcc.setBalance(new BigDecimal("1000.00"));
        aliceAcc.setAvailableBalance(new BigDecimal("1000.00"));
        accountHolderAccount = accountRepository.save(aliceAcc);
    }

    @Test
    @DisplayName("AUTHZ-01: Authenticated user can access endpoints matching their authorized role")
    void authorizedUserCanAccessEndpoints() throws Exception {
        String holderToken = jwtService.generateToken(accountHolderUser);
        String adminToken = jwtService.generateToken(adminUser);
        String auditorToken = jwtService.generateToken(auditorUser);

        // Account holder accesses account holder endpoint
        mockMvc.perform(get("/api/v1/test/account-holder-only")
                        .header("Authorization", "Bearer " + holderToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("ALLOWED_ACCOUNT_HOLDER")));

        // Admin accesses admin endpoint
        mockMvc.perform(get("/api/v1/test/admin-only")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("ALLOWED_ADMIN")));

        // Auditor accesses auditor endpoint
        mockMvc.perform(get("/api/v1/test/auditor-only")
                        .header("Authorization", "Bearer " + auditorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("ALLOWED_AUDITOR")));
    }

    @Test
    @DisplayName("AUTHZ-02: Unauthenticated request to protected endpoint returns 401 Unauthorized")
    void unauthenticatedRequestReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/test/account-holder-only"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", is("UNAUTHORIZED")));

        mockMvc.perform(get("/api/v1/test/admin-only"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", is("UNAUTHORIZED")));
    }

    @Test
    @DisplayName("AUTHZ-03: Authenticated user without required role receives 403 Forbidden")
    void authenticatedUserWithoutRoleReturns403() throws Exception {
        String holderToken = jwtService.generateToken(accountHolderUser);
        String auditorToken = jwtService.generateToken(auditorUser);

        // Account holder attempting admin endpoint -> 403
        mockMvc.perform(get("/api/v1/test/admin-only")
                        .header("Authorization", "Bearer " + holderToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error", is("ACCESS_DENIED")));

        // Account holder attempting auditor endpoint -> 403
        mockMvc.perform(get("/api/v1/test/auditor-only")
                        .header("Authorization", "Bearer " + holderToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error", is("ACCESS_DENIED")));

        // Auditor attempting admin endpoint -> 403
        mockMvc.perform(get("/api/v1/test/admin-only")
                        .header("Authorization", "Bearer " + auditorToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error", is("ACCESS_DENIED")));
    }

    @Test
    @DisplayName("AUTHZ-04: Object-level authorization prevents IDOR and client-supplied identity spoofing (T-04)")
    void objectLevelAuthorizationPreventsIdor() throws Exception {
        // Create another account belonging to Bob
        User bob = userRepository.save(new User("Bob Target", "bob.target@finguard.io", passwordEncoder.encode("Pass123!"), Role.ACCOUNT_HOLDER));
        Account bobAcc = new Account(
                bob,
                "ACC-BOB-2002",
                AccountType.CHECKING,
                "USD"
        );
        bobAcc.setBalance(new BigDecimal("5000.00"));
        bobAcc.setAvailableBalance(new BigDecimal("5000.00"));
        Account bobAccount = accountRepository.save(bobAcc);

        String aliceToken = jwtService.generateToken(accountHolderUser);

        // 1. Alice can access her own account
        mockMvc.perform(get("/api/v1/test/accounts/" + accountHolderAccount.getId() + "/check-ownership")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accountNumber", is("ACC-ALICE-1001")));

        // 2. Alice CANNOT access Bob's account: IDOR attempt rejected with 403 Forbidden
        mockMvc.perform(get("/api/v1/test/accounts/" + bobAccount.getId() + "/check-ownership")
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error", is("ACCESS_DENIED")));

        // 3. Client spoofing attempt: Alice sends Bob's userId in the request payload
        mockMvc.perform(post("/api/v1/test/verify-identity-not-spoofable")
                        .header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("userId", bob.getId().toString(), "role", "ADMINISTRATOR"))))
                .andExpect(status().isOk())
                // Server resolutely binds to Alice's true authenticated principal
                .andExpect(jsonPath("$.authoritativeUserId", is(accountHolderUser.getId().toString())))
                .andExpect(jsonPath("$.authoritativeEmail", is("alice.holder@finguard.io")))
                .andExpect(jsonPath("$.authoritativeRole", is("ACCOUNT_HOLDER")));
    }

    @Test
    @DisplayName("AUTHZ-05: Public registration cannot create ADMINISTRATOR (T-05 Privilege Escalation defense)")
    void publicRegistrationCannotCreateAdministrator() throws Exception {
        String payload = "{" +
                "\"name\": \"Mallory Malicious\"," +
                "\"email\": \"mallory.admin@finguard.io\"," +
                "\"password\": \"MalloryPass123!\"," +
                "\"role\": \"ADMINISTRATOR\"" +
                "}";

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role", is("ACCOUNT_HOLDER"))); // Server unconditionally forces ACCOUNT_HOLDER

        User user = userRepository.findByEmail("mallory.admin@finguard.io").orElseThrow();
        assertThat(user.getRole()).isEqualTo(Role.ACCOUNT_HOLDER);
    }

    @Test
    @DisplayName("AUTHZ-06: Public registration cannot create AUDITOR (T-05 Privilege Escalation defense)")
    void publicRegistrationCannotCreateAuditor() throws Exception {
        String payload = "{" +
                "\"name\": \"Oscar Outsider\"," +
                "\"email\": \"oscar.auditor@finguard.io\"," +
                "\"password\": \"OscarPass123!\"," +
                "\"role\": \"AUDITOR\"" +
                "}";

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role", is("ACCOUNT_HOLDER"))); // Server unconditionally forces ACCOUNT_HOLDER

        User user = userRepository.findByEmail("oscar.auditor@finguard.io").orElseThrow();
        assertThat(user.getRole()).isEqualTo(Role.ACCOUNT_HOLDER);
    }

    @Test
    @DisplayName("AUTHZ-07: Client cannot mass-assign role, balance, or owner fields during registration (T-05, T-07)")
    void clientCannotMassAssignFields() throws Exception {
        String payload = "{" +
                "\"name\": \"Eve Eavesdropper\"," +
                "\"email\": \"eve@finguard.io\"," +
                "\"password\": \"EveSecurePassword123!\"," +
                "\"role\": \"ADMINISTRATOR\"," +
                "\"balance\": 1000000.00," +
                "\"availableBalance\": 1000000.00," +
                "\"ownerId\": \"" + UUID.randomUUID() + "\"," +
                "\"enabled\": false" +
                "}";

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role", is("ACCOUNT_HOLDER")))
                .andExpect(jsonPath("$.enabled", is(true)))
                .andExpect(jsonPath("$.balance").doesNotExist());

        User user = userRepository.findByEmail("eve@finguard.io").orElseThrow();
        assertThat(user.getRole()).isEqualTo(Role.ACCOUNT_HOLDER);
        assertThat(user.isEnabled()).isTrue();
    }

    @Test
    @DisplayName("AUTHZ-08: JWT/client-supplied role claim cannot override authoritative database role (T-01, T-05)")
    void clientRoleInJwtCannotOverrideServerRole() throws Exception {
        // Attacker is legitimately an ACCOUNT_HOLDER in PostgreSQL
        User attacker = userRepository.save(new User(
                "Attacker",
                "attacker@finguard.io",
                passwordEncoder.encode("SecretPass123!"),
                Role.ACCOUNT_HOLDER
        ));

        // Attacker creates or obtains a token where the 'role' claim claims to be ADMINISTRATOR
        // (signed with legitimate secret, e.g. from compromised token or testing)
        String forgedRoleToken = jwtService.generateToken(attacker.getId(), attacker.getEmail(), Role.ADMINISTRATOR, 30);

        // When attacker attempts to call an admin-only endpoint:
        // The JwtAuthenticationFilter loads the user from PostgreSQL (where role = ACCOUNT_HOLDER)
        // and assigns authorities strictly from the database, NOT from the token claim.
        mockMvc.perform(get("/api/v1/test/admin-only")
                        .header("Authorization", "Bearer " + forgedRoleToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error", is("ACCESS_DENIED")));
    }
}

