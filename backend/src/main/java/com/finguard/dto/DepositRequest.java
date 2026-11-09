package com.finguard.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Request payload for initiating an inbound deposit.
 * Strictly ignores client-supplied userId, balance, role, or transaction status.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record DepositRequest(
        @NotNull(message = "Deposit amount is required")
        BigDecimal amount,

        @Size(max = 255, message = "Description must not exceed 255 characters")
        String description,

        @Size(max = 50, message = "Source method must not exceed 50 characters")
        String sourceMethod
) {}
