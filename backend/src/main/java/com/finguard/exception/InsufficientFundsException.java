package com.finguard.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when an account has insufficient funds to satisfy a withdrawal (F-01, FIN-07).
 */
public class InsufficientFundsException extends ApiException {

    public InsufficientFundsException(String message) {
        super(HttpStatus.UNPROCESSABLE_ENTITY, "INSUFFICIENT_FUNDS", message);
    }
}

