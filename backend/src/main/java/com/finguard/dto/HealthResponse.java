package com.finguard.dto;

import java.time.Instant;

public record HealthResponse(
        String status,
        String service,
        String version,
        Instant timestamp
) {
    public static HealthResponse up(String service, String version) {
        return new HealthResponse("UP", service, version, Instant.now());
    }
}

