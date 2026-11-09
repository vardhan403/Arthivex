package com.finguard.service;

import com.finguard.dto.*;
import com.finguard.entity.*;
import com.finguard.exception.*;
import com.finguard.repository.AccountRepository;
import com.finguard.repository.FinancialTransactionRepository;
import com.finguard.repository.UserRepository;
import com.finguard.security.AccountAccessPolicy;
import com.finguard.security.UserPrincipal;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Financial Transaction & Core Ledger Service (Phases 3 & 4).
 * - Single authoritative service for deposits, withdrawals, transfers, and ledger mutation.
 * - Enforces deterministic row locking and pessimistic concurrency control (CONC-01 to CONC-06).
 * - Enforces server-side funds verification AFTER lock acquisition (T-10, T-11).
 * - Enforces per-user idempotency with request fingerprinting (IDEM-01 to IDEM-08).
 * - Enforces atomic commit across transaction records, ledger entries, and balance updates.
 */
@Service
public class FinancialTransactionService {

    private final FinancialTransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final DoubleEntryLedgerService doubleEntryLedgerService;
    private final AccountAccessPolicy accountAccessPolicy;
    private final TransactionReferenceGenerator referenceGenerator;
    private final AuditService auditService;
    private final IdempotencyService idempotencyService;
    private final EntityManager entityManager;

    public FinancialTransactionService(
            FinancialTransactionRepository transactionRepository,
            AccountRepository accountRepository,
            UserRepository userRepository,
            DoubleEntryLedgerService doubleEntryLedgerService,
            AccountAccessPolicy accountAccessPolicy,
            TransactionReferenceGenerator referenceGenerator,
            AuditService auditService,
            IdempotencyService idempotencyService,
            EntityManager entityManager) {
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
        this.doubleEntryLedgerService = doubleEntryLedgerService;
        this.accountAccessPolicy = accountAccessPolicy;
        this.referenceGenerator = referenceGenerator;
        this.auditService = auditService;
        this.idempotencyService = idempotencyService;
        this.entityManager = entityManager;
    }

    /**
     * Executes an inbound fund deposit atomically with optional idempotency.
     */
    @Transactional
    public TransactionResponse processDeposit(
            UUID accountId,
            DepositRequest request,
            UserPrincipal principal,
            String idempotencyKey,
            String correlationId) {

        // 1. Idempotency pre-check if key provided
        String fingerprint = null;
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            BigDecimal amt = (request != null && request.amount() != null) ? request.amount() : BigDecimal.ZERO;
            fingerprint = idempotencyService.computeFingerprint("DEPOSIT:" + accountId + ":" + amt.toPlainString());
            Optional<IdempotencyRecord> existing = idempotencyService.findRecord(principal.getId(), idempotencyKey, fingerprint);
            if (existing.isPresent() && existing.get().getStatus() == IdempotencyStatus.COMPLETED) {
                return idempotencyService.deserializeResponse(existing.get().getResponsePayload(), TransactionResponse.class);
            }
        }

        // 2. Validate financial amount
        if (request == null) {
            throw new InvalidAmountException("Deposit request body is required.");
        }
        BigDecimal amount = validateAmount(request.amount());

        // 3. Acquire pessimistic lock on target account
        Account account = accountRepository.findByIdWithPessimisticLock(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found with ID: " + accountId));
        entityManager.refresh(account);

        // 4. Verify ownership & status under lock
        if (!account.getUser().getId().equals(principal.getId()) && principal.getRole() != Role.AUDITOR) {
            throw new AccessDeniedException("Access to the requested account is denied.");
        }
        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new AccountNotActiveException("Account " + accountId + " is not ACTIVE. Current status: " + account.getStatus());
        }

        // 5. Re-check idempotency under lock
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<IdempotencyRecord> existing = idempotencyService.findRecord(principal.getId(), idempotencyKey, fingerprint);
            if (existing.isPresent() && existing.get().getStatus() == IdempotencyStatus.COMPLETED) {
                return idempotencyService.deserializeResponse(existing.get().getResponsePayload(), TransactionResponse.class);
            }
        }

        // 6. Resolve system clearing account for double-entry balancing
        Account clearingAccount = resolveClearingAccount(account.getCurrency());

        // 7. Create financial transaction record
        String reference = referenceGenerator.generateReference();
        String description = request.description() != null && !request.description().isBlank()
                ? request.description()
                : "Liquidity Inflow Deposit (" + (request.sourceMethod() != null ? request.sourceMethod() : "Vault Gateway") + ")";

        FinancialTransaction tx = new FinancialTransaction(
                reference,
                account,
                TransactionType.DEPOSIT,
                amount,
                account.getCurrency(),
                TransactionStatus.COMPLETED,
                description
        );
        FinancialTransaction savedTx = transactionRepository.save(tx);

        // 8. Double-entry accounting: Debit Clearing Account, Credit Customer Account
        doubleEntryLedgerService.recordBalancedEntries(
                savedTx,
                clearingAccount,
                account,
                amount,
                account.getCurrency()
        );

        // 9. Update stored balances
        account.setBalance(account.getBalance().add(amount));
        account.setAvailableBalance(account.getAvailableBalance().add(amount));
        accountRepository.save(account);

        clearingAccount.setBalance(clearingAccount.getBalance().subtract(amount));
        clearingAccount.setAvailableBalance(clearingAccount.getAvailableBalance().subtract(amount));
        accountRepository.save(clearingAccount);

        TransactionResponse response = TransactionResponse.fromEntity(savedTx, account.getBalance());

        // 10. Record idempotency if key provided
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            User user = userRepository.findById(principal.getId()).orElseThrow();
            idempotencyService.recordSuccess(user, idempotencyKey, fingerprint, response, 201);
        }

        // 11. Record immutable audit event
        auditService.recordEvent(
                principal.getId(),
                "DEPOSIT_COMPLETED",
                "ACCOUNT",
                account.getId().toString(),
                correlationId,
                "Deposited " + amount + " " + account.getCurrency() + " to account " + account.getAccountNumber() + " (Ref: " + reference + ")"
        );

        return response;
    }

    @Transactional
    public TransactionResponse processDeposit(
            UUID accountId,
            DepositRequest request,
            UserPrincipal principal,
            String correlationId) {
        return processDeposit(accountId, request, principal, null, correlationId);
    }

    /**
     * Executes an outbound fund withdrawal atomically with pessimistic locking and optional idempotency.
     */
    @Transactional
    public TransactionResponse processWithdrawal(
            UUID accountId,
            WithdrawalRequest request,
            UserPrincipal principal,
            String idempotencyKey,
            String correlationId) {

        // 1. Idempotency pre-check if key provided
        String fingerprint = null;
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            BigDecimal amt = (request != null && request.amount() != null) ? request.amount() : BigDecimal.ZERO;
            fingerprint = idempotencyService.computeFingerprint("WITHDRAW:" + accountId + ":" + amt.toPlainString());
            Optional<IdempotencyRecord> existing = idempotencyService.findRecord(principal.getId(), idempotencyKey, fingerprint);
            if (existing.isPresent() && existing.get().getStatus() == IdempotencyStatus.COMPLETED) {
                return idempotencyService.deserializeResponse(existing.get().getResponsePayload(), TransactionResponse.class);
            }
        }

        // 2. Validate financial amount before locking
        if (request == null) {
            throw new InvalidAmountException("Withdrawal request body is required.");
        }
        BigDecimal amount = validateAmount(request.amount());

        // 3. Acquire Pessimistic Write Lock on source account (T-10, CONC-01)
        Account account = accountRepository.findByIdWithPessimisticLock(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found with ID: " + accountId));
        entityManager.refresh(account);

        // 4. Verify ownership & active status under lock
        if (!account.getUser().getId().equals(principal.getId()) && principal.getRole() != Role.AUDITOR) {
            throw new AccessDeniedException("Access to the requested account is denied.");
        }
        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new AccountNotActiveException("Account " + accountId + " is not ACTIVE. Current status: " + account.getStatus());
        }

        // 5. Re-check idempotency under lock if key provided
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<IdempotencyRecord> existing = idempotencyService.findRecord(principal.getId(), idempotencyKey, fingerprint);
            if (existing.isPresent() && existing.get().getStatus() == IdempotencyStatus.COMPLETED) {
                return idempotencyService.deserializeResponse(existing.get().getResponsePayload(), TransactionResponse.class);
            }
        }

        // 6. Check sufficient funds AFTER row lock is acquired (T-10, F-01)
        if (account.getAvailableBalance().compareTo(amount) < 0) {
            auditService.recordEvent(
                    principal.getId(),
                    "WITHDRAWAL_FAILED_INSUFFICIENT_FUNDS",
                    "ACCOUNT",
                    account.getId().toString(),
                    correlationId,
                    "Withdrawal rejected: available " + account.getAvailableBalance() + " < requested " + amount
            );
            throw new InsufficientFundsException("Insufficient funds. Available: " + account.getAvailableBalance() + ", Requested: " + amount);
        }

        // 7. Resolve system clearing account for double-entry balancing
        Account clearingAccount = resolveClearingAccount(account.getCurrency());

        // 8. Create financial transaction record
        String reference = referenceGenerator.generateReference();
        String description = request.notes() != null && !request.notes().isBlank()
                ? request.notes()
                : "External Outbound Disbursement" + (request.destinationAccount() != null ? " to " + request.destinationAccount() : "");

        FinancialTransaction tx = new FinancialTransaction(
                reference,
                account,
                TransactionType.WITHDRAWAL,
                amount,
                account.getCurrency(),
                TransactionStatus.COMPLETED,
                description
        );
        FinancialTransaction savedTx = transactionRepository.save(tx);

        // 9. Double-entry accounting: Debit Customer Account, Credit Clearing Account
        doubleEntryLedgerService.recordBalancedEntries(
                savedTx,
                account,
                clearingAccount,
                amount,
                account.getCurrency()
        );

        // 10. Update customer and clearing account balances
        account.setBalance(account.getBalance().subtract(amount));
        account.setAvailableBalance(account.getAvailableBalance().subtract(amount));
        accountRepository.save(account);

        clearingAccount.setBalance(clearingAccount.getBalance().add(amount));
        clearingAccount.setAvailableBalance(clearingAccount.getAvailableBalance().add(amount));
        accountRepository.save(clearingAccount);

        TransactionResponse response = TransactionResponse.fromEntity(savedTx, account.getBalance());

        // 11. Record idempotency if key provided
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            User user = userRepository.findById(principal.getId()).orElseThrow();
            idempotencyService.recordSuccess(user, idempotencyKey, fingerprint, response, 201);
        }

        // 12. Record immutable audit event
        auditService.recordEvent(
                principal.getId(),
                "WITHDRAWAL_COMPLETED",
                "ACCOUNT",
                account.getId().toString(),
                correlationId,
                "Withdrew " + amount + " " + account.getCurrency() + " from account " + account.getAccountNumber() + " (Ref: " + reference + ")"
        );

        return response;
    }

    @Transactional
    public TransactionResponse processWithdrawal(
            UUID accountId,
            WithdrawalRequest request,
            UserPrincipal principal,
            String correlationId) {
        return processWithdrawal(accountId, request, principal, null, correlationId);
    }

    /**
     * Executes an account-to-account transfer atomically with deterministic locking and idempotency (Phase 4).
     */
    @Transactional
    public TransferResponse processTransfer(
            TransferRequest request,
            UserPrincipal principal,
            String idempotencyKey,
            String correlationId) {

        // 1. Enforce Idempotency Key requirement (IDEM-01, T-08)
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new MissingIdempotencyKeyException("Idempotency-Key header is required for account transfers.");
        }

        if (request == null) {
            throw new InvalidTransferException("Transfer request body is required.");
        }

        if (request.sourceAccountId() == null) {
            throw new InvalidTransferException("Source account ID is required.");
        }

        UUID destinationAccountId = request.resolveDestinationAccountId();
        if (destinationAccountId == null) {
            throw new InvalidTransferException("Destination account ID is required.");
        }

        // 2. Reject same-account transfers (FIN-TRANSFER-06)
        if (request.sourceAccountId().equals(destinationAccountId)) {
            throw new InvalidTransferException("Source account and destination account cannot be identical.");
        }

        // 3. Validate financial amount (positive, scale <= 2)
        BigDecimal amount = validateAmount(request.amount());

        // 4. Compute canonical fingerprint (T-09, IDEM-04)
        String canonicalPayload = request.sourceAccountId() + ":" + destinationAccountId + ":" + amount.toPlainString();
        String fingerprint = idempotencyService.computeFingerprint(canonicalPayload);

        // 5. Pre-check idempotency record (T-08, T-09, IDEM-02, IDEM-03, IDEM-04)
        Optional<IdempotencyRecord> existingOpt = idempotencyService.findRecord(principal.getId(), idempotencyKey, fingerprint);
        if (existingOpt.isPresent()) {
            IdempotencyRecord record = existingOpt.get();
            if (record.getStatus() == IdempotencyStatus.COMPLETED) {
                return idempotencyService.deserializeResponse(record.getResponsePayload(), TransferResponse.class);
            }
            if (record.getStatus() == IdempotencyStatus.IN_PROGRESS) {
                throw new ConcurrentRequestInProgressException("A transfer with this idempotency key is currently processing.");
            }
        }

        // 6. Deterministic Account Locking (CONC-04, T-11)
        // Sort account IDs deterministically to eliminate deadlocks on concurrent opposite-direction transfers
        UUID sourceId = request.sourceAccountId();
        UUID destId = destinationAccountId;

        UUID firstId = sourceId.compareTo(destId) < 0 ? sourceId : destId;
        UUID secondId = sourceId.compareTo(destId) < 0 ? destId : sourceId;

        Account firstAccount = accountRepository.findByIdWithPessimisticLock(firstId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found with ID: " + firstId));
        entityManager.refresh(firstAccount);

        Account secondAccount = accountRepository.findByIdWithPessimisticLock(secondId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found with ID: " + secondId));
        entityManager.refresh(secondAccount);

        Account sourceAccount = sourceId.equals(firstId) ? firstAccount : secondAccount;
        Account destAccount = destId.equals(firstId) ? firstAccount : secondAccount;

        // 7. Re-check idempotency under lock in case a concurrent request with the same key just completed
        existingOpt = idempotencyService.findRecord(principal.getId(), idempotencyKey, fingerprint);
        if (existingOpt.isPresent() && existingOpt.get().getStatus() == IdempotencyStatus.COMPLETED) {
            return idempotencyService.deserializeResponse(existingOpt.get().getResponsePayload(), TransferResponse.class);
        }

        // 8. Validate accounts eligibility under lock
        if (!sourceAccount.getUser().getId().equals(principal.getId()) && principal.getRole() != Role.AUDITOR) {
            throw new AccessDeniedException("Access to source account is denied.");
        }
        if (sourceAccount.getStatus() != AccountStatus.ACTIVE) {
            throw new AccountNotActiveException("Source account " + sourceId + " is not ACTIVE. Current status: " + sourceAccount.getStatus());
        }
        if (destAccount.getStatus() != AccountStatus.ACTIVE) {
            throw new AccountNotActiveException("Destination account is not ACTIVE.");
        }
        if (destAccount.getAccountType() == AccountType.CLEARING) {
            throw new InvalidTransferException("Transfers to system clearing accounts are prohibited.");
        }
        if (!sourceAccount.getCurrency().equalsIgnoreCase(destAccount.getCurrency())) {
            throw new InvalidTransferException("Cross-currency transfers are not supported. Source: " + sourceAccount.getCurrency() + ", Dest: " + destAccount.getCurrency());
        }

        // Sandbox / Demo isolation check (PART 5 - Strict Data Separation)
        if (principal.getRole() == Role.DEMO_USER) {
            if (!destAccount.getUser().getId().equals(principal.getId())) {
                throw new AccessDeniedException("Demo sandbox transfers can only be executed between demo-owned accounts.");
            }
        } else {
            if (destAccount.getUser().getRole() == Role.DEMO_USER) {
                throw new AccessDeniedException("Transfers targeting demo sandbox accounts are prohibited.");
            }
        }

        // 9. Check balance AFTER lock is acquired (T-10, T-11, FIN-TRANSFER-02)
        if (sourceAccount.getAvailableBalance().compareTo(amount) < 0) {
            auditService.recordEvent(
                    principal.getId(),
                    "TRANSFER_FAILED_INSUFFICIENT_FUNDS",
                    "ACCOUNT",
                    sourceAccount.getId().toString(),
                    correlationId,
                    "Transfer rejected: available " + sourceAccount.getAvailableBalance() + " < requested " + amount
            );
            throw new InsufficientFundsException("Insufficient funds. Available: " + sourceAccount.getAvailableBalance() + ", Requested: " + amount);
        }

        // 10. Create FinancialTransaction record (T-12)
        String reference = referenceGenerator.generateReference();
        String description = request.description() != null && !request.description().isBlank()
                ? request.description()
                : "Internal Transfer to Account " + destAccount.getAccountNumber();

        FinancialTransaction tx = new FinancialTransaction(
                reference,
                sourceAccount,
                TransactionType.TRANSFER,
                amount,
                sourceAccount.getCurrency(),
                TransactionStatus.COMPLETED,
                description
        );
        FinancialTransaction savedTx = transactionRepository.save(tx);

        // 11. Balanced Double-Entry Ledger (T-13, FIN-TRANSFER-08)
        // Debit Source Customer Account, Credit Destination Customer Account
        doubleEntryLedgerService.recordBalancedEntries(
                savedTx,
                sourceAccount,
                destAccount,
                amount,
                sourceAccount.getCurrency()
        );

        // 12. Update balances atomically
        sourceAccount.setBalance(sourceAccount.getBalance().subtract(amount));
        sourceAccount.setAvailableBalance(sourceAccount.getAvailableBalance().subtract(amount));
        accountRepository.save(sourceAccount);

        destAccount.setBalance(destAccount.getBalance().add(amount));
        destAccount.setAvailableBalance(destAccount.getAvailableBalance().add(amount));
        accountRepository.save(destAccount);

        // 13. Construct sanitized response (no recipient private data leakage)
        TransferResponse response = TransferResponse.fromEntity(savedTx, destAccount.getId(), sourceAccount.getBalance());

        // 14. Commit Idempotency Record (T-08, IDEM-02)
        User user = userRepository.findById(principal.getId()).orElseThrow();
        idempotencyService.recordSuccess(user, idempotencyKey, fingerprint, response, 201);

        // 15. Record Audit Event (T-20)
        auditService.recordEvent(
                principal.getId(),
                "TRANSFER_COMPLETED",
                "TRANSACTION",
                savedTx.getId().toString(),
                correlationId,
                "Transferred " + amount + " " + sourceAccount.getCurrency() + " from " + sourceAccount.getAccountNumber() + " to " + destAccount.getAccountNumber() + " (Ref: " + reference + ")"
        );

        return response;
    }

    /**
     * Lists transaction history for an authorized account.
     */
    @Transactional(readOnly = true)
    public List<TransactionResponse> getAccountTransactions(
            UUID accountId,
            UserPrincipal principal,
            Pageable pageable) {
        Account account = accountAccessPolicy.assertAccountOwnership(principal, accountId);
        Page<FinancialTransaction> page = transactionRepository.findByAccountIdOrderByCreatedAtDesc(account.getId(), pageable);
        return page.stream()
                .map(tx -> {
                    if (!tx.getAccount().getId().equals(account.getId())) {
                        return new TransactionResponse(
                                tx.getId(),
                                tx.getReference(),
                                account.getId(),
                                account.getAccountNumber(),
                                tx.getTransactionType(),
                                tx.getAmount(),
                                tx.getCurrency(),
                                tx.getStatus(),
                                tx.getDescription(),
                                account.getBalance(),
                                tx.getCreatedAt(),
                                tx.getCompletedAt()
                        );
                    }
                    return TransactionResponse.fromEntity(tx, account.getBalance());
                })
                .toList();
    }

    /**
     * Retrieves specific transaction details along with balanced double-entry ledger entries.
     */
    @Transactional(readOnly = true)
    public TransactionDetailsResponse getTransactionDetails(UUID transactionId, UserPrincipal principal) {
        FinancialTransaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with ID: " + transactionId));

        List<LedgerEntry> entries = doubleEntryLedgerService.getEntriesForTransaction(tx.getId());
        boolean isDirectOwner = tx.getAccount().getUser() != null && tx.getAccount().getUser().getId().equals(principal.getId());
        boolean isPartyViaLedger = entries.stream()
                .anyMatch(le -> le.getAccount().getUser() != null && le.getAccount().getUser().getId().equals(principal.getId()));

        if (!isDirectOwner && !isPartyViaLedger && principal.getRole() != com.finguard.entity.Role.AUDITOR) {
            throw new org.springframework.security.access.AccessDeniedException("Access to transaction details is denied.");
        }

        List<LedgerEntryResponse> entryResponses = entries.stream()
                .map(LedgerEntryResponse::fromEntity)
                .toList();

        boolean isBalanced = doubleEntryLedgerService.verifyTransactionLedgerBalance(tx.getId());

        return new TransactionDetailsResponse(
                TransactionResponse.fromEntity(tx, tx.getAccount().getBalance()),
                entryResponses,
                isBalanced
        );
    }

    private static final BigDecimal MAX_PERMISSIBLE_AMOUNT = new BigDecimal("999999999999999.99");

    /**
     * Validates that a financial amount is strictly positive with at most 2 decimal places.
     */
    public BigDecimal validateAmount(BigDecimal amount) {
        if (amount == null) {
            throw new InvalidAmountException("Financial transaction amount cannot be null.");
        }
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidAmountException("Transaction amount must be strictly greater than $0.00.");
        }
        if (amount.compareTo(MAX_PERMISSIBLE_AMOUNT) > 0) {
            throw new InvalidAmountException("Transaction amount exceeds maximum permissible limit.");
        }
        if (amount.stripTrailingZeros().scale() > 2) {
            throw new InvalidAmountException("Transaction amount cannot have more than 2 decimal places.");
        }
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Resolves or provisions the designated system clearing account for double-entry balancing.
     */
    private Account resolveClearingAccount(String currency) {
        String clearingNumber = "SYS-CLEARING-" + (currency != null ? currency.toUpperCase() : "USD");
        Optional<Account> clearingOpt = accountRepository.findByAccountNumber(clearingNumber);
        if (clearingOpt.isPresent()) {
            return clearingOpt.get();
        }

        List<Account> allAccounts = accountRepository.findAll();
        for (Account a : allAccounts) {
            if (a.getAccountType() == AccountType.CLEARING) {
                return a;
            }
        }

        User systemUser = userRepository.findByEmail("system@finguard.internal")
                .orElseGet(() -> {
                    User su = new User("FinGuard Clearing Vault", "system@finguard.internal", "N/A", Role.ADMINISTRATOR);
                    su.setEnabled(false);
                    return userRepository.save(su);
                });

        Account clearing = new Account(systemUser, clearingNumber, AccountType.CLEARING, currency);
        clearing.setBalance(BigDecimal.ZERO.setScale(2, RoundingMode.UNNECESSARY));
        clearing.setAvailableBalance(BigDecimal.ZERO.setScale(2, RoundingMode.UNNECESSARY));
        clearing.setDailyLimit(new BigDecimal("1000000000.00"));
        clearing.setStatus(AccountStatus.ACTIVE);
        return accountRepository.save(clearing);
    }
}
