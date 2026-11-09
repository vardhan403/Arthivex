package com.finguard.service;

import com.finguard.dto.AccountResponse;
import com.finguard.dto.CreateAccountRequest;
import com.finguard.entity.Account;
import com.finguard.entity.AccountStatus;
import com.finguard.entity.Role;
import com.finguard.entity.User;
import com.finguard.exception.ResourceNotFoundException;
import com.finguard.repository.AccountRepository;
import com.finguard.repository.UserRepository;
import com.finguard.security.AccountAccessPolicy;
import com.finguard.security.AuthAuditService;
import com.finguard.security.UserPrincipal;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

/**
 * Account Management Service.
 * - Enforces server-side ownership (client cannot specify ownerId or userId).
 * - Enforces zero initial financial balance (client cannot create balance).
 * - Enforces server-side account number generation.
 * - Enforces server-side object-level authorization (IDOR/BOLA defense).
 */
@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final AccountAccessPolicy accountAccessPolicy;
    private final AccountNumberGenerator accountNumberGenerator;
    private final AuthAuditService authAuditService;
    private final AuditService auditService;

    public AccountService(
            AccountRepository accountRepository,
            UserRepository userRepository,
            AccountAccessPolicy accountAccessPolicy,
            AccountNumberGenerator accountNumberGenerator,
            AuthAuditService authAuditService,
            AuditService auditService) {
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
        this.accountAccessPolicy = accountAccessPolicy;
        this.accountNumberGenerator = accountNumberGenerator;
        this.authAuditService = authAuditService;
        this.auditService = auditService;
    }

    @Transactional
    public AccountResponse createAccount(CreateAccountRequest request, UserPrincipal principal) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication required to create an account.");
        }

        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + principal.getId()));

        if (!user.isEnabled()) {
            throw new AccessDeniedException("Disabled user accounts cannot create new financial accounts.");
        }

        // Generate non-guessable account number server-side
        String accountNumber = accountNumberGenerator.generateUniqueAccountNumber();

        // Safe defaults and server-side state enforcement
        Account account = new Account(
                user,
                accountNumber,
                request != null ? request.resolveAccountType() : null,
                request != null ? request.resolveCurrency() : "INR"
        );

        // Security invariant: Initial balance is strictly zero, controlled solely by backend
        account.setBalance(BigDecimal.ZERO.setScale(2, RoundingMode.UNNECESSARY));
        account.setAvailableBalance(BigDecimal.ZERO.setScale(2, RoundingMode.UNNECESSARY));
        account.setStatus(AccountStatus.ACTIVE);
        account.setDailyLimit(new BigDecimal("250000.00"));

        Account saved = accountRepository.save(account);
        authAuditService.logAccountCreated(user.getId(), saved.getId(), saved.getAccountNumber());
        auditService.recordEvent(
                user.getId(),
                user.getEmail(),
                "ACCOUNT_CREATED",
                "ACCOUNT",
                saved.getId().toString(),
                UUID.randomUUID().toString(),
                "Account created: " + saved.getAccountNumber() + " (" + saved.getCurrency() + ")",
                "SUCCESS"
        );

        return AccountResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> listAccounts(UserPrincipal principal) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication required.");
        }

        // Server-side filtering: Account holders and Demo users only see their own accounts
        if (principal.getRole() == Role.ACCOUNT_HOLDER || principal.getRole() == Role.DEMO_USER) {
            return accountRepository.findByUserId(principal.getId()).stream()
                    .map(AccountResponse::fromEntity)
                    .toList();
        }

        // Administrators and Auditors can list all non-clearing accounts
        return accountRepository.findAll().stream()
                .filter(acc -> acc.getAccountType() != com.finguard.entity.AccountType.CLEARING)
                .map(AccountResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public AccountResponse getAccountById(UUID accountId, UserPrincipal principal) {
        // Enforces object-level authorization (IDOR/BOLA defense)
        Account account = accountAccessPolicy.assertAccountOwnership(principal, accountId);
        return AccountResponse.fromEntity(account);
    }
}

