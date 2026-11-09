package com.finguard.controller;

import com.finguard.dto.DepositRequest;
import com.finguard.dto.TransactionResponse;
import com.finguard.dto.WithdrawalRequest;
import com.finguard.security.UserPrincipal;
import com.finguard.service.FinancialTransactionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Controller for Account-scoped Deposits, Withdrawals, and Transaction History.
 */
@RestController
@RequestMapping({"/api/v1/accounts/{accountId}", "/api/accounts/{accountId}"})
public class DepositWithdrawalController {

    private final FinancialTransactionService transactionService;

    public DepositWithdrawalController(FinancialTransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping("/deposits")
    public ResponseEntity<TransactionResponse> deposit(
            @PathVariable UUID accountId,
            @Valid @RequestBody DepositRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {
        String correlationId = extractCorrelationId(httpRequest);
        TransactionResponse response = transactionService.processDeposit(accountId, request, principal, idempotencyKey, correlationId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/withdrawals")
    public ResponseEntity<TransactionResponse> withdraw(
            @PathVariable UUID accountId,
            @Valid @RequestBody WithdrawalRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {
        String correlationId = extractCorrelationId(httpRequest);
        TransactionResponse response = transactionService.processWithdrawal(accountId, request, principal, idempotencyKey, correlationId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<TransactionResponse>> getAccountTransactions(
            @PathVariable UUID accountId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal principal) {
        int safePage = Math.max(0, Math.min(page, 10000));
        int safeSize = Math.max(1, Math.min(size, 100));
        Pageable pageable = PageRequest.of(safePage, safeSize);
        List<TransactionResponse> transactions = transactionService.getAccountTransactions(accountId, principal, pageable);
        return ResponseEntity.ok(transactions);
    }

    private String extractCorrelationId(HttpServletRequest request) {
        String id = request.getHeader("X-Correlation-Id");
        return (id != null && !id.isBlank()) ? id : UUID.randomUUID().toString().substring(0, 8);
    }
}

