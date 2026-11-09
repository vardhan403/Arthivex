package com.finguard.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Request payload for initiating an outbound fund withdrawal.
 * Strictly ignores client-supplied userId, balance, role, or transaction status.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record WithdrawalRequest(
        @NotNull(message = "Withdrawal amount is required")
        BigDecimal amount,

        @Size(max = 100, message = "Destination account must not exceed 100 characters")
        String destinationAccount,

        @Size(max = 50, message = "Routing number must not exceed 50 characters")
        String routingNumber,

        @Size(max = 255, message = "Notes must not exceed 255 characters")
        String notes
) {}
