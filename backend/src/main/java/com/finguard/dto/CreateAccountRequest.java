package com.finguard.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.finguard.entity.AccountType;
import jakarta.validation.constraints.Pattern;

/**
 * Request payload for creating an account.
 * Strictly ignores client-supplied userId, ownerId, role, balance, availableBalance, status, or dailyLimit.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CreateAccountRequest(
        AccountType accountType,

        @Pattern(regexp = "^(USD|EUR|INR)$", message = "Supported currencies are USD, EUR, and INR")
        String currency
) {
    public AccountType resolveAccountType() {
        if (accountType == AccountType.CLEARING) {
            throw new IllegalArgumentException("Creation of system clearing accounts is not permitted.");
        }
        return accountType != null ? accountType : AccountType.CHECKING;
    }

    public String resolveCurrency() {
        return currency != null && !currency.isBlank() ? currency.toUpperCase().trim() : "INR";
    }
}

