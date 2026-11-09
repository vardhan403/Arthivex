package com.finguard.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when an Idempotency-Key is reused with a different request payload (IDEM-04, T-09).
 */
public class IdempotencyConflictException extends ApiException {

    public IdempotencyConflictException(String message) {
        super(HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT", message);
    }
}

