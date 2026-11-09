package com.finguard.dto;

import com.finguard.entity.FinancialTransaction;
import com.finguard.entity.TransactionStatus;
import com.finguard.entity.TransactionType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TransactionResponse(
        UUID id,
        String reference,
        UUID accountId,
        String accountNumber,
        TransactionType type,
        BigDecimal amount,
        String currency,
        TransactionStatus status,
        String description,
        BigDecimal resultingBalance,
        Instant createdAt,
        Instant completedAt
) {
    public static TransactionResponse fromEntity(FinancialTransaction tx, BigDecimal resultingBalance) {
        return new TransactionResponse(
                tx.getId(),
                tx.getReference(),
                tx.getAccount().getId(),
                tx.getAccount().getAccountNumber(),
                tx.getTransactionType(),
                tx.getAmount(),
                tx.getCurrency(),
                tx.getStatus(),
                tx.getDescription(),
                resultingBalance,
                tx.getCreatedAt(),
                tx.getCompletedAt()
        );
    }
}

