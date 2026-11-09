package com.finguard.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when a financial write endpoint requires an Idempotency-Key header but none was provided (IDEM-01, T-08).
 */
public class MissingIdempotencyKeyException extends ApiException {

    public MissingIdempotencyKeyException(String message) {
        super(HttpStatus.BAD_REQUEST, "MISSING_IDEMPOTENCY_KEY", message);
    }
}

