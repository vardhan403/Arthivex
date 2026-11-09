package com.finguard.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        String error,
        String message,
        String correlationId,
        Instant timestamp,
        List<ValidationErrorItem> details
) {
    @JsonProperty("errorCode")
    public String getErrorCode() {
        return error;
    }

    public record ValidationErrorItem(String field, String message) {
    }

    public static ErrorResponse of(String error, String message, String correlationId) {
        return new ErrorResponse(error, message, correlationId, Instant.now(), null);
    }

    public static ErrorResponse of(String error, String message, String correlationId, List<ValidationErrorItem> details) {
        return new ErrorResponse(error, message, correlationId, Instant.now(), details);
    }
}
