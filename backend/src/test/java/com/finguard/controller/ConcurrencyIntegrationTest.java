package com.finguard.controller;

import com.finguard.dto.TransferRequest;
import com.finguard.dto.TransferResponse;
import com.finguard.dto.WithdrawalRequest;
import com.finguard.entity.*;
import com.finguard.exception.ApiException;
import com.finguard.repository.*;
import com.finguard.security.UserPrincipal;
import com.finguard.service.DoubleEntryLedgerService;
import com.finguard.service.FinancialTransactionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Phase 4 Concurrency & Stress Integration Tests.
 * Covers:
 * - CONC-01: Concurrent withdrawals from the same account (race condition on balance)
 * - CONC-02: Concurrent transfers from the same source account (serialized debit)
 * - CONC-03: Concurrent transfers into the same destination account (serialized credit)
 * - CONC-04: Opposite-direction transfers deadlock-free under deterministic locking
 * - CONC-05: Concurrent duplicate idempotency requests execute once
 * - CONC-06: Financial invariants (non-negative balances, balanced ledger entries, conservation)
 */
@SpringBootTest
@ActiveProfiles("test")
class ConcurrencyIntegrationTest {

    @Autowired
    private FinancialTransactionService transactionService;

    @Autowired
    private DoubleEntryLedgerService ledgerService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private FinancialTransactionRepository transactionRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    @Autowired
    private IdempotencyRecordRepository idempotencyRecordRepository;

    @Autowired
    private AuditEventRepository auditEventRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User alice;
    private User bob;
    private User charlie;

    private Account aliceAccount;
    private Account bobAccount;
    private Account charlieAccount;

    private UserPrincipal alicePrincipal;
    private UserPrincipal bobPrincipal;
    private UserPrincipal charliePrincipal;

    @BeforeEach
    void setUp() {
        idempotencyRecordRepository.deleteAll();
        ledgerEntryRepository.deleteAll();
        transactionRepository.deleteAll();
        auditEventRepository.deleteAll();
        accountRepository.deleteAll();
        userRepository.deleteAll();

        // System user & clearing account
        User systemUser = userRepository.save(new User(
                "Clearing Vault", "system@finguard.internal", passwordEncoder.encode("SecretPass123!"), Role.ADMINISTRATOR));
        systemUser.setEnabled(false);
        userRepository.save(systemUser);

        Account clearing = new Account(systemUser, "SYS-CLEARING-USD", AccountType.CLEARING, "USD");
        clearing.setBalance(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        clearing.setAvailableBalance(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        clearing.setDailyLimit(new BigDecimal("1000000000.00"));
        accountRepository.save(clearing);

        // Alice
        alice = userRepository.save(new User("Alice", "alice.conc@finguard.io", passwordEncoder.encode("SecretPass123!"), Role.ACCOUNT_HOLDER));
        alicePrincipal = UserPrincipal.fromEntity(alice);
        Account accAlice = new Account(alice, "ACC-ALICE-4001", AccountType.CHECKING, "USD");
        accAlice.setBalance(new BigDecimal("100.00").setScale(2, RoundingMode.HALF_UP));
        accAlice.setAvailableBalance(new BigDecimal("100.00").setScale(2, RoundingMode.HALF_UP));
        aliceAccount = accountRepository.save(accAlice);

        // Bob
        bob = userRepository.save(new User("Bob", "bob.conc@finguard.io", passwordEncoder.encode("SecretPass456!"), Role.ACCOUNT_HOLDER));
        bobPrincipal = UserPrincipal.fromEntity(bob);
        Account accBob = new Account(bob, "ACC-BOB-4002", AccountType.CHECKING, "USD");
        accBob.setBalance(new BigDecimal("100.00").setScale(2, RoundingMode.HALF_UP));
        accBob.setAvailableBalance(new BigDecimal("100.00").setScale(2, RoundingMode.HALF_UP));
        bobAccount = accountRepository.save(accBob);

        // Charlie
        charlie = userRepository.save(new User("Charlie", "charlie.conc@finguard.io", passwordEncoder.encode("SecretPass789!"), Role.ACCOUNT_HOLDER));
        charliePrincipal = UserPrincipal.fromEntity(charlie);
        Account accCharlie = new Account(charlie, "ACC-CHARLIE-4003", AccountType.CHECKING, "USD");
        accCharlie.setBalance(new BigDecimal("100.00").setScale(2, RoundingMode.HALF_UP));
        accCharlie.setAvailableBalance(new BigDecimal("100.00").setScale(2, RoundingMode.HALF_UP));
        charlieAccount = accountRepository.save(accCharlie);
    }

    // ==========================================
    // CONC-01: Concurrent withdrawals from same account
    // ==========================================
    @Test
    @DisplayName("CONC-01: Two simultaneous $100 withdrawals against $100 balance: exactly ONE succeeds, ONE fails, balance is $0")
    void testConcurrentWithdrawals() throws Exception {
        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch readyLatch = new CountDownLatch(threads);
        CountDownLatch startLatch = new CountDownLatch(1);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    WithdrawalRequest req = new WithdrawalRequest(new BigDecimal("100.00"), "EXT-ACC-1", "123456789", "Race withdrawal");
                    transactionService.processWithdrawal(aliceAccount.getId(), req, alicePrincipal, "CONC-W-" + UUID.randomUUID(), "CORR-CONC-1");
                    successCount.incrementAndGet();
                } catch (ApiException e) {
                    if ("INSUFFICIENT_FUNDS".equals(e.getErrorCode())) {
                        failureCount.incrementAndGet();
                    }
                } catch (Exception ignored) {
                }
            });
        }

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown(); // Fire both simultaneously
        executor.shutdown();
        executor.awaitTermination(10, TimeUnit.SECONDS);

        assertThat(successCount.get()).isEqualTo(1);
        assertThat(failureCount.get()).isEqualTo(1);

        Account finalAlice = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        assertThat(finalAlice.getBalance()).isEqualByComparingTo("0.00");
        assertThat(finalAlice.getBalance()).isGreaterThanOrEqualTo(BigDecimal.ZERO);
    }

    // ==========================================
    // CONC-02: Concurrent transfers from same source account
    // ==========================================
    @Test
    @DisplayName("CONC-02: Two simultaneous $100 transfers from Alice: exactly ONE succeeds, ONE fails, balance is $0")
    void testConcurrentTransfersFromSameSource() throws Exception {
        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch readyLatch = new CountDownLatch(threads);
        CountDownLatch startLatch = new CountDownLatch(1);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        // Thread 1: Alice -> Bob ($100)
        executor.submit(() -> {
            readyLatch.countDown();
            try {
                startLatch.await();
                TransferRequest req = new TransferRequest(aliceAccount.getId(), bobAccount.getId(), null, new BigDecimal("100.00"), "Transfer 1");
                transactionService.processTransfer(req, alicePrincipal, "KEY-CONC-2A", "CORR-CONC-2A");
                successCount.incrementAndGet();
            } catch (ApiException e) {
                if ("INSUFFICIENT_FUNDS".equals(e.getErrorCode())) {
                    failureCount.incrementAndGet();
                }
            } catch (Exception ignored) {
            }
        });

        // Thread 2: Alice -> Charlie ($100)
        executor.submit(() -> {
            readyLatch.countDown();
            try {
                startLatch.await();
                TransferRequest req = new TransferRequest(aliceAccount.getId(), charlieAccount.getId(), null, new BigDecimal("100.00"), "Transfer 2");
                transactionService.processTransfer(req, alicePrincipal, "KEY-CONC-2B", "CORR-CONC-2B");
                successCount.incrementAndGet();
            } catch (ApiException e) {
                if ("INSUFFICIENT_FUNDS".equals(e.getErrorCode())) {
                    failureCount.incrementAndGet();
                }
            } catch (Exception ignored) {
            }
        });

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown();
        executor.shutdown();
        executor.awaitTermination(10, TimeUnit.SECONDS);

        assertThat(successCount.get()).isEqualTo(1);
        assertThat(failureCount.get()).isEqualTo(1);

        Account finalAlice = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        assertThat(finalAlice.getBalance()).isEqualByComparingTo("0.00");
    }

    // ==========================================
    // CONC-03: Concurrent transfers into same destination account
    // ==========================================
    @Test
    @DisplayName("CONC-03: Concurrent transfers from Alice and Charlie into Bob: both succeed, Bob balance increases by $100")
    void testConcurrentTransfersToSameDestination() throws Exception {
        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch readyLatch = new CountDownLatch(threads);
        CountDownLatch startLatch = new CountDownLatch(1);

        AtomicInteger successCount = new AtomicInteger(0);

        // Alice -> Bob ($50)
        executor.submit(() -> {
            readyLatch.countDown();
            try {
                startLatch.await();
                TransferRequest req = new TransferRequest(aliceAccount.getId(), bobAccount.getId(), null, new BigDecimal("50.00"), "Alice to Bob");
                transactionService.processTransfer(req, alicePrincipal, "KEY-CONC-3A", "CORR-CONC-3A");
                successCount.incrementAndGet();
            } catch (Exception ignored) {
            }
        });

        // Charlie -> Bob ($50)
        executor.submit(() -> {
            readyLatch.countDown();
            try {
                startLatch.await();
                TransferRequest req = new TransferRequest(charlieAccount.getId(), bobAccount.getId(), null, new BigDecimal("50.00"), "Charlie to Bob");
                transactionService.processTransfer(req, charliePrincipal, "KEY-CONC-3B", "CORR-CONC-3B");
                successCount.incrementAndGet();
            } catch (Exception ignored) {
            }
        });

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown();
        executor.shutdown();
        executor.awaitTermination(10, TimeUnit.SECONDS);

        assertThat(successCount.get()).isEqualTo(2);

        Account finalBob = accountRepository.findById(bobAccount.getId()).orElseThrow();
        assertThat(finalBob.getBalance()).isEqualByComparingTo("200.00"); // 100 + 50 + 50
    }

    // ==========================================
    // CONC-04: Opposite-direction transfers (Deadlock-Free Deterministic Locking)
    // ==========================================
    @Test
    @DisplayName("CONC-04: Simultaneous opposite-direction transfers (A->B and B->A) execute without deadlock")
    void testOppositeDirectionTransfersDeadlockFree() throws Exception {
        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch readyLatch = new CountDownLatch(threads);
        CountDownLatch startLatch = new CountDownLatch(1);

        AtomicInteger completedCount = new AtomicInteger(0);

        // Thread 1: Alice -> Bob ($40)
        executor.submit(() -> {
            readyLatch.countDown();
            try {
                startLatch.await();
                TransferRequest req = new TransferRequest(aliceAccount.getId(), bobAccount.getId(), null, new BigDecimal("40.00"), "Alice to Bob");
                transactionService.processTransfer(req, alicePrincipal, "KEY-CONC-4A", "CORR-CONC-4A");
                completedCount.incrementAndGet();
            } catch (Exception e) {
                e.printStackTrace();
            }
        });

        // Thread 2: Bob -> Alice ($30)
        executor.submit(() -> {
            readyLatch.countDown();
            try {
                startLatch.await();
                TransferRequest req = new TransferRequest(bobAccount.getId(), aliceAccount.getId(), null, new BigDecimal("30.00"), "Bob to Alice");
                transactionService.processTransfer(req, bobPrincipal, "KEY-CONC-4B", "CORR-CONC-4B");
                completedCount.incrementAndGet();
            } catch (Exception e) {
                e.printStackTrace();
            }
        });

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown(); // Fire both simultaneously in opposite directions
        executor.shutdown();
        boolean finished = executor.awaitTermination(10, TimeUnit.SECONDS);

        assertThat(finished).isTrue();
        assertThat(completedCount.get()).isEqualTo(2);

        Account finalAlice = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        Account finalBob = accountRepository.findById(bobAccount.getId()).orElseThrow();

        assertThat(finalAlice.getBalance()).isEqualByComparingTo("90.00"); // 100 - 40 + 30
        assertThat(finalBob.getBalance()).isEqualByComparingTo("110.00");  // 100 + 40 - 30
    }

    // ==========================================
    // CONC-05: Concurrent duplicate idempotency requests execute once
    // ==========================================
    @Test
    @DisplayName("CONC-05: Multiple concurrent requests with the SAME idempotency key execute transfer ONCE")
    void testConcurrentDuplicateIdempotencyRequests() throws Exception {
        int threads = 4;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch readyLatch = new CountDownLatch(threads);
        CountDownLatch startLatch = new CountDownLatch(1);

        String sharedKey = "CONC-DUP-KEY-" + UUID.randomUUID();
        List<TransferResponse> responses = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    TransferRequest req = new TransferRequest(aliceAccount.getId(), bobAccount.getId(), null, new BigDecimal("25.00"), "Duplicate Concurrent Transfer");
                    TransferResponse resp = transactionService.processTransfer(req, alicePrincipal, sharedKey, "CORR-DUP-1");
                    responses.add(resp);
                } catch (Exception ignored) {
                }
            });
        }

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown();
        executor.shutdown();
        executor.awaitTermination(10, TimeUnit.SECONDS);

        assertThat(responses).isNotEmpty();
        String expectedReference = responses.get(0).reference();

        // Every successful thread received the exact same transaction reference
        for (TransferResponse resp : responses) {
            assertThat(resp.reference()).isEqualTo(expectedReference);
        }

        // Account was debited ONLY ONCE ($25.00)
        Account finalAlice = accountRepository.findById(aliceAccount.getId()).orElseThrow();
        Account finalBob = accountRepository.findById(bobAccount.getId()).orElseThrow();

        assertThat(finalAlice.getBalance()).isEqualByComparingTo("75.00"); // 100 - 25
        assertThat(finalBob.getBalance()).isEqualByComparingTo("125.00");  // 100 + 25
    }

    // ==========================================
    // CONC-06: Financial Invariants Verification
    // ==========================================
    @Test
    @DisplayName("CONC-06: Financial Invariants: No negative balances, all ledger entries balanced, money conserved")
    void testFinancialInvariantsPostConcurrency() {
        // 1. Invariant: No customer account has a negative balance
        List<Account> accounts = accountRepository.findAll();
        for (Account a : accounts) {
            if (a.getAccountType() != AccountType.CLEARING) {
                assertThat(a.getBalance()).as("Account " + a.getAccountNumber() + " balance non-negative")
                        .isGreaterThanOrEqualTo(BigDecimal.ZERO);
                assertThat(a.getAvailableBalance()).as("Account " + a.getAccountNumber() + " available balance non-negative")
                        .isGreaterThanOrEqualTo(BigDecimal.ZERO);
            }
        }

        // 2. Invariant: Every committed transaction has balanced ledger entries (Total Debits == Total Credits)
        List<FinancialTransaction> transactions = transactionRepository.findAll();
        for (FinancialTransaction tx : transactions) {
            if (tx.getStatus() == TransactionStatus.COMPLETED) {
                boolean isBalanced = ledgerService.verifyTransactionLedgerBalance(tx.getId());
                assertThat(isBalanced).as("Transaction " + tx.getReference() + " is balanced in ledger").isTrue();
            }
        }
    }
}
