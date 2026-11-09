package com.finguard.dto;

import com.finguard.entity.FinancialTransaction;
import com.finguard.entity.TransactionStatus;
import com.finguard.entity.TransactionType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Sanitized response for account-to-account transfer.
 * Only returns information required to display the transfer, avoiding enumeration or leakage
 * of private recipient account balances or ownership.
 */
public record TransferResponse(
        UUID id,
        String reference,
        UUID sourceAccountId,
        UUID destinationAccountId,
        TransactionType type,
        BigDecimal amount,
        String currency,
        TransactionStatus status,
        String description,
        BigDecimal resultingBalance,
        Instant createdAt
) {
    public static TransferResponse fromEntity(
            FinancialTransaction tx,
            UUID destinationAccountId,
            BigDecimal sourceResultingBalance) {
        return new TransferResponse(
                tx.getId(),
                tx.getReference(),
                tx.getAccount().getId(),
                destinationAccountId,
                tx.getTransactionType(),
                tx.getAmount(),
                tx.getCurrency(),
                tx.getStatus(),
                tx.getDescription(),
                sourceResultingBalance,
                tx.getCreatedAt()
        );
    }
}

