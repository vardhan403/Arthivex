package com.finguard.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminBootstrapRequest(
        @NotBlank(message = "Administrator name is required")
        @Size(max = 100, message = "Name must not exceed 100 characters")
        String name,

        @NotBlank(message = "Administrator email is required")
        @Email(message = "Must be a valid email address")
        @Size(max = 255, message = "Email must not exceed 255 characters")
        String email,

        @NotBlank(message = "Passphrase is required")
        @Size(min = 8, max = 128, message = "Passphrase must be between 8 and 128 characters")
        String password,

        @NotBlank(message = "Server-side bootstrap secret is required")
        String bootstrapSecret
) {
}

