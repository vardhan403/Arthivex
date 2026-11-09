package com.finguard.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finguard.dto.LoginRequest;
import com.finguard.dto.RegisterRequest;
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
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthenticationIntegrationTest {

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

    @BeforeEach
    void setUp() {
        accountRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("AUTH-01: Valid registration succeeds with 201 Created and minimal public profile")
    void validRegistrationSucceeds() throws Exception {
        RegisterRequest request = new RegisterRequest("Alice Smith", null, null, "alice@finguard.io", "SecurePassword123!");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.name", is("Alice Smith")))
                .andExpect(jsonPath("$.email", is("alice@finguard.io")))
                .andExpect(jsonPath("$.role", is("ACCOUNT_HOLDER")))
                .andExpect(jsonPath("$.enabled", is(true)))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    @DisplayName("AUTH-02: Password is stored hashed with BCrypt, never in plaintext or returned in API")
    void passwordStoredHashedNeverPlaintext() throws Exception {
        RegisterRequest request = new RegisterRequest("Bob Jones", null, null, "bob@finguard.io", "PlainSecret999!");

        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        // 1. Verify API response does not leak password or hash
        String responseBody = result.getResponse().getContentAsString();
        assertThat(responseBody).doesNotContain("PlainSecret999!");
        assertThat(responseBody).doesNotContain("passwordHash");

        // 2. Verify database stores exclusively BCrypt hash
        Optional<User> userOpt = userRepository.findByEmail("bob@finguard.io");
        assertThat(userOpt).isPresent();
        User user = userOpt.get();
        assertThat(user.getPasswordHash()).startsWith("$2a$12$");
        assertThat(user.getPasswordHash()).doesNotContain("PlainSecret999!");
        assertThat(passwordEncoder.matches("PlainSecret999!", user.getPasswordHash())).isTrue();
    }

    @Test
    @DisplayName("AUTH-03: Duplicate email registration is safely rejected with 409 Conflict")
    void duplicateEmailRegistrationRejectedSafely() throws Exception {
        RegisterRequest request = new RegisterRequest("Charlie Brown", null, null, "charlie@finguard.io", "MyPass123456!");

        // Initial registration succeeds
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        // Duplicate registration attempt rejected
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error", is("DUPLICATE_RESOURCE")))
                .andExpect(jsonPath("$.message", containsString("already exists")))
                .andExpect(jsonPath("$.correlationId", notNullValue()));
    }

    @Test
    @DisplayName("AUTH-04: Valid credentials produce a cryptographically valid short-lived JWT")
    void validCredentialsProduceJwt() throws Exception {
        RegisterRequest reg = new RegisterRequest("Diana Prince", null, null, "diana@finguard.io", "AmazonGuard2026!");
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reg)))
                .andExpect(status().isCreated());

        LoginRequest login = new LoginRequest("diana@finguard.io", "AmazonGuard2026!", null);
        MvcResult mvcResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.tokenType", is("Bearer")))
                .andExpect(jsonPath("$.expiresIn", is(1800))) // 30 minutes in seconds
                .andExpect(jsonPath("$.user.email", is("diana@finguard.io")))
                .andReturn();

        JsonNode root = objectMapper.readTree(mvcResult.getResponse().getContentAsString());
        String token = root.get("token").asText();

        // Cryptographically verify the token
        assertThat(jwtService.validateToken(token)).isTrue();
        assertThat(jwtService.extractEmail(token)).isEqualTo("diana@finguard.io");
        assertThat(jwtService.extractRole(token)).isEqualTo(Role.ACCOUNT_HOLDER);
    }

    @Test
    @DisplayName("AUTH-05: Generic authentication failure for both unknown email and wrong password (T-26 Enumeration defense)")
    void invalidCredentialsGenericFailure() throws Exception {
        RegisterRequest reg = new RegisterRequest("Evan Wright", null, null, "evan@finguard.io", "ValidSecret123!");
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reg)))
                .andExpect(status().isCreated());

        // 1. Unknown email
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("nonexistent@finguard.io", "AnyPassword!", null))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", is("INVALID_CREDENTIALS")))
                .andExpect(jsonPath("$.message", is("Invalid email or password.")));

        // 2. Known email with incorrect password: EXACT SAME status and message
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("evan@finguard.io", "WrongPassword999!", null))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", is("INVALID_CREDENTIALS")))
                .andExpect(jsonPath("$.message", is("Invalid email or password.")));
    }

    @Test
    @DisplayName("AUTH-06: Expired JWT is rejected with 401 Unauthorized")
    void expiredJwtIsRejected() throws Exception {
        User user = new User("Frank Castle", "frank@finguard.io", passwordEncoder.encode("Pass12345!"), Role.ACCOUNT_HOLDER);
        userRepository.save(user);

        // Generate token expired 10 minutes ago
        String expiredToken = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole(), -10);

        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + expiredToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", is("UNAUTHORIZED")));
    }

    @Test
    @DisplayName("AUTH-07: Tampered JWT payload or signature is rejected with 401 Unauthorized")
    void tamperedJwtIsRejected() throws Exception {
        User user = new User("Grace Hopper", "grace@finguard.io", passwordEncoder.encode("Pass12345!"), Role.ACCOUNT_HOLDER);
        userRepository.save(user);

        String validToken = jwtService.generateToken(user);

        // Tamper with signature by appending corrupted characters
        String tamperedToken = validToken.substring(0, validToken.length() - 6) + "xxxxxx";

        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + tamperedToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", is("UNAUTHORIZED")));
    }

    @Test
    @DisplayName("AUTH-08: Malformed JWT string is rejected with 401 Unauthorized")
    void malformedJwtIsRejected() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer not-a-valid-jwt-token-structure"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", is("UNAUTHORIZED")));
    }

    @Test
    @DisplayName("AUTH-09: Unsupported alg=none JWT algorithm is strictly rejected (T-01)")
    void algNoneIsRejected() throws Exception {
        // Construct standard alg=none token: {"alg":"none","typ":"JWT"}.{"sub":"...","role":"ACCOUNT_HOLDER"}.
        String header = Base64.getUrlEncoder().withoutPadding().encodeToString("{\"alg\":\"none\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payload = Base64.getUrlEncoder().withoutPadding().encodeToString(
                ("{\"sub\":\"" + UUID.randomUUID() + "\",\"email\":\"hacker@finguard.io\",\"role\":\"ADMINISTRATOR\"}").getBytes(StandardCharsets.UTF_8)
        );
        String algNoneToken = header + "." + payload + ".";

        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + algNoneToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", is("UNAUTHORIZED")));
    }

    @Test
    @DisplayName("AUTH-10: Disabled user cannot authenticate or access endpoints even with active token")
    void disabledUserCannotAuthenticate() throws Exception {
        User user = new User("Hank Pym", "hank@finguard.io", passwordEncoder.encode("PymParticles!"), Role.ACCOUNT_HOLDER);
        user.setEnabled(false); // User disabled
        userRepository.save(user);

        // 1. Cannot log in
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest("hank@finguard.io", "PymParticles!", null))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", is("INVALID_CREDENTIALS")));

        // 2. Token generated before disablement is immediately rejected on live DB lookup
        String previouslyIssuedToken = jwtService.generateToken(user);
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + previouslyIssuedToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error", is("UNAUTHORIZED")));
    }

    @Test
    @DisplayName("AUTH-11: Authenticated user can upload, retrieve, and delete profile picture")
    void profilePictureLifecycleSucceeds() throws Exception {
        User user = new User("Ada Lovelace", "ada.avatar@arthivex.io", passwordEncoder.encode("SecurePass123!"), Role.ACCOUNT_HOLDER);
        userRepository.save(user);

        String token = jwtService.generateToken(user);
        String validAvatarData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

        // 1. Update avatar via JSON
        mockMvc.perform(post("/api/v1/auth/avatar")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"profilePicture\":\"" + validAvatarData + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profilePicture", is(validAvatarData)));

        // 2. Verify /api/v1/auth/me returns persisted avatar
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profilePicture", is(validAvatarData)));

        // 3. Remove avatar
        mockMvc.perform(delete("/api/v1/auth/avatar")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profilePicture").doesNotExist());

        // 4. Verify /api/v1/auth/me reflects removal
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profilePicture").doesNotExist());
    }

    @Test
    @DisplayName("AUTH-12: Invalid avatar image format is rejected with 400 Bad Request")
    void invalidAvatarFormatIsRejected() throws Exception {
        User user = new User("Alan Turing", "alan.avatar@arthivex.io", passwordEncoder.encode("SecurePass123!"), Role.ACCOUNT_HOLDER);
        userRepository.save(user);

        String token = jwtService.generateToken(user);

        // Disallowed mime format (e.g. text/html script injection)
        mockMvc.perform(post("/api/v1/auth/avatar")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"profilePicture\":\"data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", is("INVALID_ARGUMENT")));
    }
}

