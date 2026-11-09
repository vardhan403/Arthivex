package com.finguard.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when a financial amount fails validation (e.g. zero, negative, null, or excessive scale).
 */
public class InvalidAmountException extends ApiException {

    public InvalidAmountException(String message) {
        super(HttpStatus.BAD_REQUEST, "INVALID_AMOUNT", message);
    }
}

