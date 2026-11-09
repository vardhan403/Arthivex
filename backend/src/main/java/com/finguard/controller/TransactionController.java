package com.finguard.controller;

import com.finguard.dto.*;
import com.finguard.entity.Account;
import com.finguard.repository.AccountRepository;
import com.finguard.security.UserPrincipal;
import com.finguard.service.FinancialTransactionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Controller for Transaction Details and Global Transaction queries.
 */
@RestController
@RequestMapping({"/api/v1/transactions", "/api/transactions"})
public class TransactionController {

    private final FinancialTransactionService transactionService;
    private final AccountRepository accountRepository;

    public TransactionController(FinancialTransactionService transactionService, AccountRepository accountRepository) {
        this.transactionService = transactionService;
        this.accountRepository = accountRepository;
    }

    @GetMapping("/{transactionId}")
    public ResponseEntity<TransactionDetailsResponse> getTransactionDetails(
            @PathVariable UUID transactionId,
            @AuthenticationPrincipal UserPrincipal principal) {
        TransactionDetailsResponse response = transactionService.getTransactionDetails(transactionId, principal);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<TransactionResponse>> getTransactions(
            @RequestParam(required = false) UUID accountId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (accountId != null) {
            int safePage = Math.max(0, Math.min(page, 10000));
            int safeSize = Math.max(1, Math.min(size, 100));
            Pageable pageable = PageRequest.of(safePage, safeSize);
            List<TransactionResponse> transactions = transactionService.getAccountTransactions(accountId, principal, pageable);
            return ResponseEntity.ok(transactions);
        }
        List<Account> accounts = accountRepository.findByUserId(principal.getId());
        List<TransactionResponse> allTx = new ArrayList<>();
        for (Account acc : accounts) {
            allTx.addAll(transactionService.getAccountTransactions(acc.getId(), principal, PageRequest.of(0, 50)));
        }
        allTx.sort((a, b) -> {
            if (a.createdAt() == null || b.createdAt() == null) return 0;
            return b.createdAt().compareTo(a.createdAt());
        });
        return ResponseEntity.ok(allTx);
    }

    public record FrontendDepositBody(UUID accountId, BigDecimal amount, String description, String sourceMethod) {}
    public record FrontendWithdrawBody(UUID accountId, BigDecimal amount, String destinationAccount, String routingNumber, String notes) {}

    @PostMapping("/deposit")
    public ResponseEntity<TransactionResponse> depositViaTransactionEndpoint(
            @RequestBody FrontendDepositBody body,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {
        String correlationId = extractCorrelationId(httpRequest);
        DepositRequest req = new DepositRequest(body.amount(), body.description(), body.sourceMethod());
        TransactionResponse response = transactionService.processDeposit(body.accountId(), req, principal, correlationId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/withdraw")
    public ResponseEntity<TransactionResponse> withdrawViaTransactionEndpoint(
            @RequestBody FrontendWithdrawBody body,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {
        String correlationId = extractCorrelationId(httpRequest);
        WithdrawalRequest req = new WithdrawalRequest(body.amount(), body.destinationAccount(), body.routingNumber(), body.notes());
        TransactionResponse response = transactionService.processWithdrawal(body.accountId(), req, principal, correlationId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    private String extractCorrelationId(HttpServletRequest request) {
        String id = request.getHeader("X-Correlation-Id");
        return (id != null && !id.isBlank()) ? id : UUID.randomUUID().toString().substring(0, 8);
    }
}

