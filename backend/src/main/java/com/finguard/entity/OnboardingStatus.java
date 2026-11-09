package com.finguard.entity;

/**
 * Onboarding lifecycle state for user accounts.
 * Valid transitions:
 * PENDING -> APPROVED
 * PENDING -> REJECTED
 */
public enum OnboardingStatus {
    PENDING,
    APPROVED,
    REJECTED
}

