package com.finguard.exception;

import org.springframework.http.HttpStatus;

/**
 * Generic authentication failure to prevent user enumeration attacks (T-26).
 * Always returns HTTP 401 with uniform message "Invalid email or password."
 */
public class InvalidCredentialsException extends ApiException {

    public InvalidCredentialsException() {
        super(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    public InvalidCredentialsException(String message) {
        super(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", message);
    }
}

