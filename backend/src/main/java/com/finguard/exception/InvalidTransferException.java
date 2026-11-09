package com.finguard.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when a transfer violates financial or domain rules (e.g. same-account transfer, T-14).
 */
public class InvalidTransferException extends ApiException {

    public InvalidTransferException(String message) {
        super(HttpStatus.BAD_REQUEST, "INVALID_TRANSFER", message);
    }
}

