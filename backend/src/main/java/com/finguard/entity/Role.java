package com.finguard.entity;

/**
 * Controlled Role representation for FinGuard Role-Based Access Control (RBAC).
 * Enforced on the server side to prevent privilege escalation.
 */
public enum Role {
    ACCOUNT_HOLDER,
    ADMINISTRATOR,
    AUDITOR,
    DEMO_USER
}

