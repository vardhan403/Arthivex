package com.finguard.controller;

import com.finguard.entity.Account;
import com.finguard.security.AccountAccessPolicy;
import com.finguard.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Controller strictly for testing authorization boundaries in integration tests.
 */
@RestController
@RequestMapping("/api/v1/test")
public class SecurityTestController {

    private final AccountAccessPolicy accountAccessPolicy;

    public SecurityTestController(AccountAccessPolicy accountAccessPolicy) {
        this.accountAccessPolicy = accountAccessPolicy;
    }

    @GetMapping("/account-holder-only")
    @PreAuthorize("hasRole('ACCOUNT_HOLDER')")
    public ResponseEntity<Map<String, String>> accountHolderOnly() {
        return ResponseEntity.ok(Map.of("status", "ALLOWED_ACCOUNT_HOLDER"));
    }

    @GetMapping("/admin-only")
    @PreAuthorize("hasRole('ADMINISTRATOR')")
    public ResponseEntity<Map<String, String>> adminOnly() {
        return ResponseEntity.ok(Map.of("status", "ALLOWED_ADMIN"));
    }

    @GetMapping("/auditor-only")
    @PreAuthorize("hasRole('AUDITOR')")
    public ResponseEntity<Map<String, String>> auditorOnly() {
        return ResponseEntity.ok(Map.of("status", "ALLOWED_AUDITOR"));
    }

    @GetMapping("/accounts/{accountId}/check-ownership")
    public ResponseEntity<Map<String, Object>> checkOwnership(
            @PathVariable UUID accountId,
            @AuthenticationPrincipal UserPrincipal principal) {
        Account account = accountAccessPolicy.assertAccountOwnership(principal, accountId);
        return ResponseEntity.ok(Map.of(
                "accountId", account.getId().toString(),
                "accountNumber", account.getAccountNumber(),
                "ownerId", account.getUser().getId().toString()
        ));
    }

    @PostMapping("/verify-identity-not-spoofable")
    public ResponseEntity<Map<String, Object>> verifyIdentity(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserPrincipal principal) {
        // Demonstrates that even if client sends "userId": "attacker-id" in request body,
        // server strictly resolves identity from authenticated SecurityContext principal!
        return ResponseEntity.ok(Map.of(
                "authoritativeUserId", principal.getId().toString(),
                "authoritativeEmail", principal.getEmail(),
                "authoritativeRole", principal.getRole().name()
        ));
    }
}

