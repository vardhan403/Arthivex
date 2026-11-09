package com.finguard.service;

import com.finguard.dto.AdminBootstrapRequest;
import com.finguard.dto.AuthResponse;
import com.finguard.dto.LoginRequest;
import com.finguard.dto.RegisterRequest;
import com.finguard.dto.UserResponse;
import com.finguard.entity.OnboardingStatus;
import com.finguard.entity.Role;
import com.finguard.entity.User;
import com.finguard.exception.ApiException;
import com.finguard.exception.DuplicateResourceException;
import com.finguard.exception.InvalidCredentialsException;
import com.finguard.exception.RateLimitExceededException;
import com.finguard.exception.ResourceNotFoundException;
import com.finguard.repository.UserRepository;
import com.finguard.security.AuthAuditService;
import com.finguard.security.JwtService;
import com.finguard.security.LoginRateLimiter;
import com.finguard.security.UserPrincipal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Optional;
import java.util.UUID;

/**
 * Authentication and User Registration Service.
 * - Enforces server-side role assignment (ACCOUNT_HOLDER).
 * - Enforces generic authentication failures to prevent enumeration (T-26).
 * - Implements lightweight credential-stuffing rate limiting (T-02).
 * - Audits security events without leaking credentials (T-20).
 * - Secure first-administrator bootstrap mechanism.
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginRateLimiter loginRateLimiter;
    private final AuthAuditService authAuditService;
    private final AuditService auditService;
    private final DemoService demoService;
    private final String bootstrapSecretConfig;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            LoginRateLimiter loginRateLimiter,
            AuthAuditService authAuditService,
            AuditService auditService,
            DemoService demoService,
            @Value("${app.admin.bootstrap-secret:}") String bootstrapSecretConfig) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.loginRateLimiter = loginRateLimiter;
        this.authAuditService = authAuditService;
        this.auditService = auditService;
        this.demoService = demoService;
        this.bootstrapSecretConfig = bootstrapSecretConfig;
    }

    @Transactional
    public UserResponse register(RegisterRequest request, String clientIp) {
        String rateLimitKey = "REG:" + clientIp;
        if (loginRateLimiter.isBlocked(rateLimitKey)) {
            throw new RateLimitExceededException(
                    "Too many registration attempts. Please try again later.",
                    loginRateLimiter.getRetryAfterSeconds(rateLimitKey)
            );
        }

        String normalizedEmail = request.email().toLowerCase().trim();

        if (userRepository.existsByEmail(normalizedEmail)) {
            loginRateLimiter.recordFailedAttempt(rateLimitKey);
            authAuditService.logLoginFailure(normalizedEmail, clientIp, "REGISTRATION_DUPLICATE_EMAIL");
            auditService.recordEvent(null, normalizedEmail, "USER_REGISTRATION_FAILED", "USER", null, UUID.randomUUID().toString(), "Registration failed: duplicate email", "FAILURE");
            throw new DuplicateResourceException("An account with this email address already exists.");
        }

        // Secure password hashing using BCrypt (cost factor 12)
        String hashedPassword = passwordEncoder.encode(request.password());

        // Mandatory server-side enforcement: Role is unconditionally ACCOUNT_HOLDER, OnboardingStatus is PENDING
        User user = new User(
                request.resolveName(),
                normalizedEmail,
                hashedPassword,
                Role.ACCOUNT_HOLDER,
                OnboardingStatus.PENDING
        );
        user.setEnabled(true);

        User savedUser = userRepository.save(user);
        authAuditService.logRegistration(savedUser.getId(), savedUser.getEmail(), clientIp);
        auditService.recordEvent(
                savedUser.getId(),
                savedUser.getEmail(),
                "USER_REGISTERED",
                "USER",
                savedUser.getId().toString(),
                UUID.randomUUID().toString(),
                "Self-service registration completed with PENDING onboarding status",
                "SUCCESS"
        );

        return UserResponse.fromEntity(savedUser);
    }

    @Transactional
    public AuthResponse bootstrapAdmin(AdminBootstrapRequest request, String clientIp) {
        String rateLimitKey = "BOOTSTRAP:" + clientIp;
        if (loginRateLimiter.isBlocked(rateLimitKey)) {
            throw new RateLimitExceededException(
                    "Too many bootstrap attempts. Please try again later.",
                    loginRateLimiter.getRetryAfterSeconds(rateLimitKey)
            );
        }

        if (bootstrapSecretConfig == null || bootstrapSecretConfig.isBlank()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "BOOTSTRAP_DISABLED", "Administrator bootstrapping is not configured or disabled on this server.");
        }

        // Constant-time comparison to protect against timing attacks
        byte[] providedBytes = request.bootstrapSecret().getBytes(StandardCharsets.UTF_8);
        byte[] expectedBytes = bootstrapSecretConfig.getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(providedBytes, expectedBytes)) {
            loginRateLimiter.recordFailedAttempt(rateLimitKey);
            auditService.recordEvent(null, request.email(), "ADMIN_BOOTSTRAP_FAILED", "AUTH", null, UUID.randomUUID().toString(), "Invalid bootstrap secret attempt from IP: " + clientIp, "FAILURE");
            throw new ApiException(HttpStatus.FORBIDDEN, "INVALID_BOOTSTRAP_SECRET", "Invalid administrator bootstrap secret provided.");
        }

        // Guard against repeated bootstrap once an active administrator exists
        long activeAdmins = userRepository.countByRoleAndEnabledTrue(Role.ADMINISTRATOR);
        if (activeAdmins > 0) {
            loginRateLimiter.recordFailedAttempt(rateLimitKey);
            auditService.recordEvent(null, request.email(), "ADMIN_BOOTSTRAP_REJECTED", "AUTH", null, UUID.randomUUID().toString(), "Bootstrap attempt rejected: Active administrator already exists", "FAILURE");
            throw new ApiException(HttpStatus.CONFLICT, "ADMIN_ALREADY_EXISTS", "First administrator has already been bootstrapped. Bootstrap endpoint is permanently disabled.");
        }

        String normalizedEmail = request.email().toLowerCase().trim();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new DuplicateResourceException("An account with this email address already exists.");
        }

        String hashedPassword = passwordEncoder.encode(request.password());
        User admin = new User(
                request.name().trim(),
                normalizedEmail,
                hashedPassword,
                Role.ADMINISTRATOR,
                OnboardingStatus.APPROVED
        );
        admin.setEnabled(true);
        User savedAdmin = userRepository.save(admin);

        auditService.recordEvent(
                savedAdmin.getId(),
                savedAdmin.getEmail(),
                "ADMIN_BOOTSTRAPPED",
                "USER",
                savedAdmin.getId().toString(),
                UUID.randomUUID().toString(),
                "First system administrator account bootstrapped successfully",
                "SUCCESS"
        );

        String token = jwtService.generateToken(savedAdmin);
        return AuthResponse.of(token, jwtService.getExpirationSeconds(), UserResponse.fromEntity(savedAdmin));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request, String clientIp) {
        String normalizedEmail = request.email().toLowerCase().trim();
        String rateLimitKey = clientIp + ":" + normalizedEmail;

        if (loginRateLimiter.isBlocked(rateLimitKey)) {
            authAuditService.logLoginFailure(normalizedEmail, clientIp, "RATE_LIMIT_EXCEEDED");
            auditService.recordEvent(null, normalizedEmail, "LOGIN_RATE_LIMITED", "AUTH", null, UUID.randomUUID().toString(), "Login blocked by rate limiter from IP: " + clientIp, "FAILURE");
            throw new RateLimitExceededException("Too many failed login attempts. Please try again later.", loginRateLimiter.getRetryAfterSeconds(rateLimitKey));
        }

        Optional<User> userOpt = userRepository.findByEmail(normalizedEmail);

        // Generic authentication failure: uniform response whether user does not exist,
        // user is disabled, or password does not match (T-26 enumeration defense)
        if (userOpt.isEmpty()) {
            loginRateLimiter.recordFailedAttempt(rateLimitKey);
            authAuditService.logLoginFailure(normalizedEmail, clientIp, "USER_NOT_FOUND");
            auditService.recordEvent(null, normalizedEmail, "LOGIN_FAILED", "AUTH", null, UUID.randomUUID().toString(), "Login failed: user not found", "FAILURE");
            throw new InvalidCredentialsException();
        }

        User user = userOpt.get();

        if (!user.isEnabled()) {
            loginRateLimiter.recordFailedAttempt(rateLimitKey);
            authAuditService.logLoginFailure(normalizedEmail, clientIp, "USER_DISABLED");
            auditService.recordEvent(user.getId(), user.getEmail(), "LOGIN_FAILED", "USER", user.getId().toString(), UUID.randomUUID().toString(), "Login failed: user disabled", "FAILURE");
            throw new InvalidCredentialsException();
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            loginRateLimiter.recordFailedAttempt(rateLimitKey);
            authAuditService.logLoginFailure(normalizedEmail, clientIp, "BAD_CREDENTIALS");
            auditService.recordEvent(user.getId(), user.getEmail(), "LOGIN_FAILED", "USER", user.getId().toString(), UUID.randomUUID().toString(), "Login failed: incorrect password", "FAILURE");
            throw new InvalidCredentialsException();
        }

        // Credentials valid and user enabled
        loginRateLimiter.reset(rateLimitKey);
        String token = jwtService.generateToken(user);
        authAuditService.logLoginSuccess(user.getId(), user.getEmail(), clientIp);
        auditService.recordEvent(user.getId(), user.getEmail(), "LOGIN_SUCCESS", "USER", user.getId().toString(), UUID.randomUUID().toString(), "Login successful from IP: " + clientIp, "SUCCESS");

        return AuthResponse.of(token, jwtService.getExpirationSeconds(), UserResponse.fromEntity(user));
    }

    /**
     * Authenticates the dedicated public demo identity without user credentials.
     * Generates a restricted JWT for sandbox exploration.
     */
    @Transactional
    public AuthResponse demoLogin(String clientIp) {
        String rateLimitKey = "DEMO:" + clientIp;
        if (loginRateLimiter.isBlocked(rateLimitKey)) {
            authAuditService.logLoginFailure("demo@finguard.app", clientIp, "DEMO_RATE_LIMIT_EXCEEDED");
            throw new RateLimitExceededException("Too many demo access attempts. Please try again later.", loginRateLimiter.getRetryAfterSeconds(rateLimitKey));
        }

        User demoUser = demoService.ensureDemoDataProvisioned();

        if (!demoUser.isEnabled() || demoUser.getRole() != Role.DEMO_USER) {
            throw new InvalidCredentialsException("Demo access is currently unavailable.");
        }

        String token = jwtService.generateToken(demoUser);
        authAuditService.logLoginSuccess(demoUser.getId(), demoUser.getEmail(), clientIp);

        return AuthResponse.of(token, jwtService.getExpirationSeconds(), UserResponse.fromEntity(demoUser));
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UserPrincipal principal) {
        if (principal == null) {
            throw new InvalidCredentialsException("Authentication required.");
        }
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + principal.getId()));
        return UserResponse.fromEntity(user);
    }
}
