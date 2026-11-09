package com.finguard.dto;

import com.finguard.entity.Account;
import com.finguard.entity.AccountStatus;
import com.finguard.entity.AccountType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Clean account response DTO.
 * Exposes account details to authorized callers without leaking internal secrets or user passwords.
 */
public record AccountResponse(
        UUID id,
        UUID userId,
        String accountNumber,
        AccountType accountType,
        String currency,
        BigDecimal balance,
        BigDecimal availableBalance,
        BigDecimal dailyLimit,
        AccountStatus status,
        Instant createdAt,
        Instant updatedAt
) {
    public static AccountResponse fromEntity(Account account) {
        return new AccountResponse(
                account.getId(),
                account.getUser().getId(),
                account.getAccountNumber(),
                account.getAccountType(),
                account.getCurrency(),
                account.getBalance(),
                account.getAvailableBalance(),
                account.getDailyLimit(),
                account.getStatus(),
                account.getCreatedAt(),
                account.getUpdatedAt()
        );
    }
}

