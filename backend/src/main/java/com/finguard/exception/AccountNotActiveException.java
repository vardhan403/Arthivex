package com.finguard.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when attempting financial operations on non-ACTIVE accounts (e.g. FROZEN or CLOSED).
 */
public class AccountNotActiveException extends ApiException {

    public AccountNotActiveException(String message) {
        super(HttpStatus.CONFLICT, "ACCOUNT_NOT_ACTIVE", message);
    }
}

