package com.finguard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for updating user profile picture via base64 Data URL.
 */
public record UpdateAvatarRequest(
        @NotBlank(message = "Profile picture payload cannot be blank")
        @Size(max = 4_000_000, message = "Profile picture payload exceeds maximum size limit (2.5MB)")
        String profilePicture
) {}

