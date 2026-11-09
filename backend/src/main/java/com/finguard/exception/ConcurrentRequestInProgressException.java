package com.finguard.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when an identical request with the same Idempotency-Key is currently in progress (IDEM-06, T-08).
 */
public class ConcurrentRequestInProgressException extends ApiException {

    public ConcurrentRequestInProgressException(String message) {
        super(HttpStatus.CONFLICT, "CONCURRENT_REQUEST_IN_PROGRESS", message);
    }
}

