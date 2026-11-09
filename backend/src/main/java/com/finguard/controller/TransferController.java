package com.finguard.controller;

import com.finguard.dto.TransferRequest;
import com.finguard.dto.TransferResponse;
import com.finguard.exception.MissingIdempotencyKeyException;
import com.finguard.security.UserPrincipal;
import com.finguard.service.FinancialTransactionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST Controller for Atomic Account-to-Account Transfers (Phase 4).
 * Enforces mandatory Idempotency-Key, server-side authorization, and concurrency controls.
 */
@RestController
@RequestMapping({"/api/v1/transfers", "/api/transfers", "/api/v1/transactions/transfer", "/api/transactions/transfer"})
public class TransferController {

    private final FinancialTransactionService transactionService;

    public TransferController(FinancialTransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping
    public ResponseEntity<TransferResponse> executeTransfer(
            @Valid @RequestBody TransferRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new MissingIdempotencyKeyException("Idempotency-Key header is required for transfers.");
        }

        String correlationId = extractCorrelationId(httpRequest);
        TransferResponse response = transactionService.processTransfer(request, principal, idempotencyKey.trim(), correlationId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    private String extractCorrelationId(HttpServletRequest request) {
        String id = request.getHeader("X-Correlation-Id");
        return (id != null && !id.isBlank()) ? id : UUID.randomUUID().toString().substring(0, 8);
    }
}

