package com.finguard.dto;

import com.finguard.entity.OnboardingStatus;
import com.finguard.entity.Role;
import com.finguard.entity.User;

import java.time.Instant;
import java.util.UUID;

/**
 * Sanitized user representation. Never contains password hashes or database internal metadata.
 */
public record UserResponse(
        UUID id,
        String name,
        String email,
        Role role,
        OnboardingStatus onboardingStatus,
        boolean enabled,
        Instant createdAt,
        String profilePicture
) {
    public UserResponse(UUID id, String name, String email, Role role, OnboardingStatus onboardingStatus, boolean enabled, Instant createdAt) {
        this(id, name, email, role, onboardingStatus, enabled, createdAt, null);
    }

    public static UserResponse fromEntity(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getOnboardingStatus(),
                user.isEnabled(),
                user.getCreatedAt(),
                user.getProfilePicture()
        );
    }
}
