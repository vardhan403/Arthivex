package com.finguard.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finguard.dto.*;
import com.finguard.entity.OnboardingStatus;
import com.finguard.entity.Role;
import com.finguard.entity.User;
import com.finguard.repository.AccountRepository;
import com.finguard.repository.AuditEventRepository;
import com.finguard.repository.FinancialTransactionRepository;
import com.finguard.repository.UserRepository;
import com.finguard.security.JwtService;
import com.finguard.security.LoginRateLimiter;
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

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class AdminManagementIntegrationTest {

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
    private AuditEventRepository auditEventRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private LoginRateLimiter loginRateLimiter;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String TEST_BOOTSTRAP_SECRET = "test-admin-bootstrap-secret-2026";

    @BeforeEach
    void setUp() {
        ledgerEntryRepository.deleteAll();
        transactionRepository.deleteAll();
        accountRepository.deleteAll();
        auditEventRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("Bootstrap: Invalid bootstrap secret returns 403 Forbidden")
    void bootstrap_invalidSecret_returns403() throws Exception {
        AdminBootstrapRequest req = new AdminBootstrapRequest(
                "Super Admin",
                "admin.bootstrap@finguard.io",
                "AdminPassphrase123!",
                "wrong-secret-token"
        );

        mockMvc.perform(post("/api/v1/auth/bootstrap-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("INVALID_BOOTSTRAP_SECRET"));
    }

    @Test
    @DisplayName("Bootstrap: Valid secret successfully creates first administrator and returns JWT")
    void bootstrap_validSecret_success() throws Exception {
        AdminBootstrapRequest req = new AdminBootstrapRequest(
                "Lead Administrator",
                "chief.admin@finguard.io",
                "SuperAdminPass123!",
                TEST_BOOTSTRAP_SECRET
        );

        MvcResult result = mockMvc.perform(post("/api/v1/auth/bootstrap-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.role").value("ADMINISTRATOR"))
                .andExpect(jsonPath("$.user.onboardingStatus").value("APPROVED"))
                .andReturn();

        // Verify persisted user in DB
        User adminUser = userRepository.findByEmail("chief.admin@finguard.io").orElseThrow();
        assertThat(adminUser.getRole()).isEqualTo(Role.ADMINISTRATOR);
        assertThat(adminUser.getOnboardingStatus()).isEqualTo(OnboardingStatus.APPROVED);
        assertThat(adminUser.isEnabled()).isTrue();

        // Verify audit log
        assertThat(auditEventRepository.findAll()).anyMatch(e ->
                "ADMIN_BOOTSTRAPPED".equals(e.getEventType()) &&
                        "chief.admin@finguard.io".equals(e.getActorEmail())
        );
    }

    @Test
    @DisplayName("Bootstrap: Repeated bootstrap attempt rejected with 409 Conflict once admin exists")
    void bootstrap_repeatedAttempt_conflict409() throws Exception {
        // Create initial admin
        User existingAdmin = new User("Existing Admin", "existing.admin@finguard.io", passwordEncoder.encode("Pass123!"), Role.ADMINISTRATOR, OnboardingStatus.APPROVED);
        existingAdmin.setEnabled(true);
        userRepository.save(existingAdmin);

        AdminBootstrapRequest req = new AdminBootstrapRequest(
                "Second Admin Attempt",
                "intruder.admin@finguard.io",
                "AnotherPass123!",
                TEST_BOOTSTRAP_SECRET
        );

        mockMvc.perform(post("/api/v1/auth/bootstrap-admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("ADMIN_ALREADY_EXISTS"));
    }

    @Test
    @DisplayName("RBAC: Unauthenticated requests to /api/v1/admin/* return 401 Unauthorized")
    void rbac_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/admin/summary"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("RBAC: Non-admin users return 403 Forbidden on /api/v1/admin/*")
    void rbac_accountHolder_returns403() throws Exception {
        User user = new User("Alice Holder", "alice.holder@finguard.io", passwordEncoder.encode("Pass123!"), Role.ACCOUNT_HOLDER, OnboardingStatus.APPROVED);
        userRepository.save(user);
        String userToken = jwtService.generateToken(user);

        mockMvc.perform(get("/api/v1/admin/summary")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));
    }

    @Test
    @DisplayName("Admin Summary: Administrator successfully retrieves platform summary metrics")
    void admin_getSummary_success() throws Exception {
        User admin = new User("Admin Root", "admin.root@finguard.io", passwordEncoder.encode("Pass123!"), Role.ADMINISTRATOR, OnboardingStatus.APPROVED);
        userRepository.save(admin);
        String adminToken = jwtService.generateToken(admin);

        mockMvc.perform(get("/api/v1/admin/summary")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUsers").value(1))
                .andExpect(jsonPath("$.systemStatus").value("OPERATIONAL"));
    }

    @Test
    @DisplayName("User Management: Admin can list and search users")
    void admin_listAndSearchUsers() throws Exception {
        User admin = new User("Admin Root", "admin.root@finguard.io", passwordEncoder.encode("Pass123!"), Role.ADMINISTRATOR, OnboardingStatus.APPROVED);
        User user1 = new User("Bob Vance", "bob.vance@finguard.io", passwordEncoder.encode("Pass123!"), Role.ACCOUNT_HOLDER, OnboardingStatus.PENDING);
        User user2 = new User("Charlie Day", "charlie@finguard.io", passwordEncoder.encode("Pass123!"), Role.ACCOUNT_HOLDER, OnboardingStatus.APPROVED);
        userRepository.save(admin);
        userRepository.save(user1);
        userRepository.save(user2);

        String adminToken = jwtService.generateToken(admin);

        // List all users
        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(3)));

        // Search by name
        mockMvc.perform(get("/api/v1/admin/users?search=vance")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].email").value("bob.vance@finguard.io"));
    }

    @Test
    @DisplayName("User Management: Guardrail prevents deactivating the last active administrator")
    void admin_cannotDeactivateLastAdmin() throws Exception {
        User soleAdmin = new User("Sole Admin", "sole.admin@finguard.io", passwordEncoder.encode("Pass123!"), Role.ADMINISTRATOR, OnboardingStatus.APPROVED);
        soleAdmin.setEnabled(true);
        userRepository.save(soleAdmin);
        String adminToken = jwtService.generateToken(soleAdmin);

        UpdateUserStatusRequest req = new UpdateUserStatusRequest(false);

        mockMvc.perform(patch("/api/v1/admin/users/" + soleAdmin.getId() + "/status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("LAST_ADMIN_PROTECTION"));

        // Verify still enabled
        User checked = userRepository.findById(soleAdmin.getId()).orElseThrow();
        assertThat(checked.isEnabled()).isTrue();
    }

    @Test
    @DisplayName("User Management: Guardrail prevents demoting the last active administrator")
    void admin_cannotDemoteLastAdmin() throws Exception {
        User soleAdmin = new User("Sole Admin", "sole.admin@finguard.io", passwordEncoder.encode("Pass123!"), Role.ADMINISTRATOR, OnboardingStatus.APPROVED);
        soleAdmin.setEnabled(true);
        userRepository.save(soleAdmin);
        String adminToken = jwtService.generateToken(soleAdmin);

        UpdateUserRoleRequest req = new UpdateUserRoleRequest(Role.ACCOUNT_HOLDER);

        mockMvc.perform(patch("/api/v1/admin/users/" + soleAdmin.getId() + "/role")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("LAST_ADMIN_PROTECTION"));

        // Verify still ADMINISTRATOR
        User checked = userRepository.findById(soleAdmin.getId()).orElseThrow();
        assertThat(checked.getRole()).isEqualTo(Role.ADMINISTRATOR);
    }

    @Test
    @DisplayName("Onboarding: New registration sets PENDING status; Admin can approve or reject")
    void onboarding_lifecycle() throws Exception {
        // 1. Admin setup
        User admin = new User("Admin Root", "admin.root@finguard.io", passwordEncoder.encode("Pass123!"), Role.ADMINISTRATOR, OnboardingStatus.APPROVED);
        userRepository.save(admin);
        String adminToken = jwtService.generateToken(admin);

        // 2. User registers
        RegisterRequest registerReq = new RegisterRequest("New Onboardee", "onboardee@finguard.io", "Passphrase123!");
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.onboardingStatus").value("PENDING"));

        User onboardee = userRepository.findByEmail("onboardee@finguard.io").orElseThrow();
        assertThat(onboardee.getOnboardingStatus()).isEqualTo(OnboardingStatus.PENDING);

        // 3. Admin views pending onboarding
        mockMvc.perform(get("/api/v1/admin/onboarding?status=PENDING")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].email").value("onboardee@finguard.io"));

        // 4. Admin approves onboarding
        mockMvc.perform(post("/api/v1/admin/onboarding/" + onboardee.getId() + "/approve")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.onboardingStatus").value("APPROVED"));

        User approved = userRepository.findById(onboardee.getId()).orElseThrow();
        assertThat(approved.getOnboardingStatus()).isEqualTo(OnboardingStatus.APPROVED);

        // 5. Admin rejects another user
        User user2 = new User("Pending User 2", "user2@finguard.io", passwordEncoder.encode("Pass123!"), Role.ACCOUNT_HOLDER, OnboardingStatus.PENDING);
        userRepository.save(user2);

        RejectOnboardingRequest rejectReq = new RejectOnboardingRequest("Document verification failed");
        mockMvc.perform(post("/api/v1/admin/onboarding/" + user2.getId() + "/reject")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(rejectReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.onboardingStatus").value("REJECTED"));

        User rejected = userRepository.findById(user2.getId()).orElseThrow();
        assertThat(rejected.getOnboardingStatus()).isEqualTo(OnboardingStatus.REJECTED);
    }

    @Test
    @DisplayName("Audit Trail: Admin retrieves paginated audit logs with event type filtering")
    void admin_auditTrailQuery() throws Exception {
        User admin = new User("Admin Root", "admin.root@finguard.io", passwordEncoder.encode("Pass123!"), Role.ADMINISTRATOR, OnboardingStatus.APPROVED);
        userRepository.save(admin);
        String adminToken = jwtService.generateToken(admin);

        // Perform status update to generate audit log
        User victim = new User("Target User", "target@finguard.io", passwordEncoder.encode("Pass123!"), Role.ACCOUNT_HOLDER, OnboardingStatus.APPROVED);
        userRepository.save(victim);

        UpdateUserStatusRequest statusReq = new UpdateUserStatusRequest(false);
        mockMvc.perform(patch("/api/v1/admin/users/" + victim.getId() + "/status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(statusReq)))
                .andExpect(status().isOk());

        // Query audit trail
        mockMvc.perform(get("/api/v1/admin/audit?eventType=USER_STATUS_CHANGED")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].eventType").value("USER_STATUS_CHANGED"))
                .andExpect(jsonPath("$.content[0].actorEmail").value("admin.root@finguard.io"))
                .andExpect(jsonPath("$.content[0].status").value("SUCCESS"));
    }
}

