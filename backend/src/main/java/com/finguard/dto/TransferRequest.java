package com.finguard.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Request payload for initiating an account-to-account transfer.
 * Strictly ignores client-supplied userId, balance, availableBalance, role, or transaction status.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record TransferRequest(
        @NotNull(message = "Source account ID is required")
        UUID sourceAccountId,

        UUID destinationAccountId,
        UUID targetAccountId, // frontend compatibility alias

        @NotNull(message = "Transfer amount is required")
        BigDecimal amount,

        @Size(max = 255, message = "Description must not exceed 255 characters")
        String description
) {
    public UUID resolveDestinationAccountId() {
        if (destinationAccountId != null) return destinationAccountId;
        if (targetAccountId != null) return targetAccountId;
        return null;
    }
}
