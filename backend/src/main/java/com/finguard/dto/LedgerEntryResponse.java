package com.finguard.dto;

import com.finguard.entity.LedgerEntry;
import com.finguard.entity.LedgerEntryType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record LedgerEntryResponse(
        UUID id,
        UUID accountId,
        String accountNumber,
        LedgerEntryType entryType,
        BigDecimal amount,
        String currency,
        Instant createdAt
) {
    public static LedgerEntryResponse fromEntity(LedgerEntry entry) {
        return new LedgerEntryResponse(
                entry.getId(),
                entry.getAccount().getId(),
                entry.getAccount().getAccountNumber(),
                entry.getEntryType(),
                entry.getAmount(),
                entry.getCurrency(),
                entry.getCreatedAt()
        );
    }
}

