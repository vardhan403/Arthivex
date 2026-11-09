package com.finguard.controller;

import com.finguard.dto.*;
import com.finguard.entity.OnboardingStatus;
import com.finguard.entity.Role;
import com.finguard.entity.User;
import com.finguard.exception.ApiException;
import com.finguard.exception.ResourceNotFoundException;
import com.finguard.repository.AccountRepository;
import com.finguard.repository.FinancialTransactionRepository;
import com.finguard.repository.UserRepository;
import com.finguard.security.UserPrincipal;
import com.finguard.service.AuditService;
import jakarta.persistence.criteria.Predicate;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Administrative Controller.
 * Access is strictly restricted to authenticated users with the ADMINISTRATOR role (RBAC enforcement).
 * Provides endpoints for user management, onboarding approvals, audit trails, and platform telemetry.
 */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMINISTRATOR')")
public class AdminController {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final FinancialTransactionRepository transactionRepository;
    private final AuditService auditService;

    public AdminController(
            UserRepository userRepository,
            AccountRepository accountRepository,
            FinancialTransactionRepository transactionRepository,
            AuditService auditService) {
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.auditService = auditService;
    }

    /**
     * Platform Summary Telemetry for the Administrator Dashboard.
     */
    @GetMapping("/summary")
    public ResponseEntity<AdminSummaryResponse> getSummary() {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.findAll().stream().filter(User::isEnabled).count();
        long pendingOnboarding = userRepository.findByOnboardingStatus(OnboardingStatus.PENDING).size();
        long totalAccounts = accountRepository.count();
        long totalTransactions = transactionRepository.count();

        return ResponseEntity.ok(new AdminSummaryResponse(
                totalUsers,
                activeUsers,
                pendingOnboarding,
                totalAccounts,
                totalTransactions,
                "OPERATIONAL"
        ));
    }

    /**
     * List users with optional search, role filter, onboarding status filter, and pagination.
     */
    @GetMapping("/users")
    public ResponseEntity<Page<UserResponse>> listUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) OnboardingStatus onboardingStatus,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        int clampedSize = Math.clamp(size, 1, 100);
        int clampedPage = Math.max(0, page);
        Pageable pageable = PageRequest.of(clampedPage, clampedSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate nameMatch = cb.like(cb.lower(root.get("name")), pattern);
                Predicate emailMatch = cb.like(cb.lower(root.get("email")), pattern);
                predicates.add(cb.or(nameMatch, emailMatch));
            }

            if (role != null) {
                predicates.add(cb.equal(root.get("role"), role));
            }

            if (onboardingStatus != null) {
                predicates.add(cb.equal(root.get("onboardingStatus"), onboardingStatus));
            }

            if (enabled != null) {
                predicates.add(cb.equal(root.get("enabled"), enabled));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<UserResponse> users = userRepository.findAll(spec, pageable).map(UserResponse::fromEntity);
        return ResponseEntity.ok(users);
    }

    /**
     * Get details for an individual user.
     */
    @GetMapping("/users/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));
        return ResponseEntity.ok(UserResponse.fromEntity(user));
    }

    /**
     * Activate or deactivate a user account.
     * Enforces guardrails: Cannot deactivate the last active administrator.
     */
    @PatchMapping("/users/{id}/status")
    public ResponseEntity<UserResponse> updateUserStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserStatusRequest request,
            @AuthenticationPrincipal UserPrincipal adminPrincipal) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));

        boolean newEnabled = request.enabled();

        // Guard against disabling the last active administrator
        if (!newEnabled && user.getRole() == Role.ADMINISTRATOR && user.isEnabled()) {
            long activeAdmins = userRepository.countByRoleAndEnabledTrue(Role.ADMINISTRATOR);
            if (activeAdmins <= 1) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "LAST_ADMIN_PROTECTION", "Cannot deactivate the last active system administrator.");
            }
        }

        user.setEnabled(newEnabled);
        User savedUser = userRepository.save(user);

        auditService.recordEvent(
                adminPrincipal.getId(),
                adminPrincipal.getEmail(),
                "USER_STATUS_CHANGED",
                "USER",
                savedUser.getId().toString(),
                UUID.randomUUID().toString(),
                "User account status updated: enabled=" + newEnabled + " for " + savedUser.getEmail(),
                "SUCCESS"
        );

        return ResponseEntity.ok(UserResponse.fromEntity(savedUser));
    }

    /**
     * Update a user's role (RBAC).
     * Enforces guardrails:
     * - Cannot demote the last active administrator.
     * - Cannot assign DEMO_USER role to regular accounts.
     */
    @PatchMapping("/users/{id}/role")
    public ResponseEntity<UserResponse> updateUserRole(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRoleRequest request,
            @AuthenticationPrincipal UserPrincipal adminPrincipal) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));

        Role newRole = request.role();

        if (newRole == Role.DEMO_USER) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ROLE", "The DEMO_USER role cannot be assigned to standard accounts.");
        }

        // Guard against demoting the last active administrator
        if (user.getRole() == Role.ADMINISTRATOR && newRole != Role.ADMINISTRATOR && user.isEnabled()) {
            long activeAdmins = userRepository.countByRoleAndEnabledTrue(Role.ADMINISTRATOR);
            if (activeAdmins <= 1) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "LAST_ADMIN_PROTECTION", "Cannot demote the last active system administrator.");
            }
        }

        Role oldRole = user.getRole();
        user.setRole(newRole);
        User savedUser = userRepository.save(user);

        auditService.recordEvent(
                adminPrincipal.getId(),
                adminPrincipal.getEmail(),
                "USER_ROLE_CHANGED",
                "USER",
                savedUser.getId().toString(),
                UUID.randomUUID().toString(),
                "User role changed from " + oldRole + " to " + newRole + " for " + savedUser.getEmail(),
                "SUCCESS"
        );

        return ResponseEntity.ok(UserResponse.fromEntity(savedUser));
    }

    /**
     * List user onboarding requests.
     */
    @GetMapping("/onboarding")
    public ResponseEntity<Page<UserResponse>> listOnboardingRequests(
            @RequestParam(required = false, defaultValue = "PENDING") OnboardingStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        int clampedSize = Math.clamp(size, 1, 100);
        int clampedPage = Math.max(0, page);
        Pageable pageable = PageRequest.of(clampedPage, clampedSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<UserResponse> result = (status != null)
                ? userRepository.findByOnboardingStatus(status, pageable).map(UserResponse::fromEntity)
                : userRepository.findAll(pageable).map(UserResponse::fromEntity);

        return ResponseEntity.ok(result);
    }

    /**
     * Approve user onboarding request.
     */
    @PostMapping("/onboarding/{id}/approve")
    public ResponseEntity<UserResponse> approveOnboarding(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal adminPrincipal) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));

        user.setOnboardingStatus(OnboardingStatus.APPROVED);
        User savedUser = userRepository.save(user);

        auditService.recordEvent(
                adminPrincipal.getId(),
                adminPrincipal.getEmail(),
                "USER_ONBOARDING_APPROVED",
                "USER",
                savedUser.getId().toString(),
                UUID.randomUUID().toString(),
                "Onboarding approved for account: " + savedUser.getEmail(),
                "SUCCESS"
        );

        return ResponseEntity.ok(UserResponse.fromEntity(savedUser));
    }

    /**
     * Reject user onboarding request.
     */
    @PostMapping("/onboarding/{id}/reject")
    public ResponseEntity<UserResponse> rejectOnboarding(
            @PathVariable UUID id,
            @RequestBody(required = false) RejectOnboardingRequest request,
            @AuthenticationPrincipal UserPrincipal adminPrincipal) {

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + id));

        if (user.getRole() == Role.ADMINISTRATOR) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_OPERATION", "Cannot reject onboarding for an active administrator.");
        }

        user.setOnboardingStatus(OnboardingStatus.REJECTED);
        User savedUser = userRepository.save(user);

        String reason = (request != null && request.reason() != null && !request.reason().isBlank())
                ? request.reason().trim()
                : "Administrative rejection";

        auditService.recordEvent(
                adminPrincipal.getId(),
                adminPrincipal.getEmail(),
                "USER_ONBOARDING_REJECTED",
                "USER",
                savedUser.getId().toString(),
                UUID.randomUUID().toString(),
                "Onboarding rejected for account: " + savedUser.getEmail() + ". Reason: " + reason,
                "SUCCESS"
        );

        return ResponseEntity.ok(UserResponse.fromEntity(savedUser));
    }

    /**
     * Query the immutable audit trail with filtering and pagination.
     */
    @GetMapping("/audit")
    public ResponseEntity<Page<AuditEventResponse>> getAuditTrail(
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) UUID actorId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        int clampedSize = Math.clamp(size, 1, 100);
        int clampedPage = Math.max(0, page);
        Pageable pageable = PageRequest.of(clampedPage, clampedSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<AuditEventResponse> auditTrail = auditService.getAuditTrail(eventType, actorId, status, query, pageable);
        return ResponseEntity.ok(auditTrail);
    }
}
