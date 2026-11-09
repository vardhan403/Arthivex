package com.finguard.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(
        @NotNull(message = "Enabled flag is required")
        @JsonProperty("enabled")
        Boolean enabled
) {
}

