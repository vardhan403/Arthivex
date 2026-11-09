package com.finguard.security;

import com.finguard.entity.Account;
import com.finguard.entity.Role;
import com.finguard.exception.ResourceNotFoundException;
import com.finguard.repository.AccountRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Centralized object-level authorization policy (BOLA / IDOR defense, THREATS.md T-04, BACKEND.md Section 6.2).
 * Verifies that the authenticated caller owns or is explicitly authorized for the requested account.
 */
@Component
public class AccountAccessPolicy {

    private final AccountRepository accountRepository;
    private final AuthAuditService authAuditService;

    public AccountAccessPolicy(AccountRepository accountRepository, AuthAuditService authAuditService) {
        this.accountRepository = accountRepository;
        this.authAuditService = authAuditService;
    }

    /**
     * Enforces that the authenticated user owns the given account, or denies access with 403 Forbidden.
     * Prevents cross-user IDOR access (e.g. Alice trying to read Bob's account by ID).
     */
    public Account assertAccountOwnership(UserPrincipal principal, UUID accountId) {
        if (principal == null) {
            throw new AccessDeniedException("Unauthenticated access is prohibited.");
        }

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found with ID: " + accountId));

        if (account.getAccountType() == com.finguard.entity.AccountType.CLEARING) {
            authAuditService.logAccessDenied(principal.getId(), "Account:" + accountId, "CLEARING_ACCOUNT_ACCESS_ATTEMPT");
            throw new AccessDeniedException("Access to system clearing accounts is prohibited.");
        }

        boolean isOwner = account.getUser().getId().equals(principal.getId());
        boolean isAuthorizedAuditor = principal.getRole() == Role.AUDITOR; // Auditors have read-only audit inspection

        if (!isOwner && !isAuthorizedAuditor) {
            authAuditService.logAccessDenied(principal.getId(), "Account:" + accountId, "IDOR_CROSS_USER_ACCESS_ATTEMPT");
            throw new AccessDeniedException("Access to the requested account is denied.");
        }

        return account;
    }

    /**
     * Non-throwing ownership check.
     */
    public boolean canAccessAccount(UserPrincipal principal, UUID accountId) {
        if (principal == null || accountId == null) return false;
        return accountRepository.findById(accountId)
                .map(acc -> acc.getUser().getId().equals(principal.getId()) || principal.getRole() == Role.AUDITOR)
                .orElse(false);
    }
}

