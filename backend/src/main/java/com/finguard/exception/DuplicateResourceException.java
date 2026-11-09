package com.finguard.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when attempting to create a resource that already exists (e.g. duplicate email registration).
 */
public class DuplicateResourceException extends ApiException {

    public DuplicateResourceException(String message) {
        super(HttpStatus.CONFLICT, "DUPLICATE_RESOURCE", message);
    }
}

