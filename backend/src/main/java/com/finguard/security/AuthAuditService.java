package com.finguard.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Audit logging foundation for authentication and authorization security events (T-20, T-22).
 * Strictly guarantees that passwords, JWT tokens, and sensitive secrets are never logged.
 */
@Service
public class AuthAuditService {

    private static final Logger securityLog = LoggerFactory.getLogger("com.finguard.security.AUDIT");

    public void logRegistration(UUID userId, String email, String ip) {
        securityLog.info("SECURITY_EVENT=USER_REGISTERED userId={} email={} ip={}", userId, maskEmail(email), sanitizeIp(ip));
    }

    public void logAccountCreated(UUID userId, UUID accountId, String accountNumber) {
        securityLog.info("SECURITY_EVENT=ACCOUNT_CREATED userId={} accountId={} accountNumber={}", userId, accountId, accountNumber);
    }

    public void logLoginSuccess(UUID userId, String email, String ip) {
        securityLog.info("SECURITY_EVENT=LOGIN_SUCCESS userId={} email={} ip={}", userId, maskEmail(email), sanitizeIp(ip));
    }

    public void logLoginFailure(String email, String ip, String reason) {
        securityLog.warn("SECURITY_EVENT=LOGIN_FAILED email={} ip={} reason={}", maskEmail(email), sanitizeIp(ip), reason);
    }

    public void logTokenRejection(String ip, String reason) {
        securityLog.warn("SECURITY_EVENT=TOKEN_REJECTED ip={} reason={}", sanitizeIp(ip), reason);
    }

    public void logAccessDenied(UUID userId, String resource, String reason) {
        securityLog.warn("SECURITY_EVENT=ACCESS_DENIED userId={} resource={} reason={}", userId, resource, reason);
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "unknown";
        int atIndex = email.indexOf('@');
        if (atIndex <= 2) return "***" + email.substring(atIndex);
        return email.substring(0, 2) + "***" + email.substring(atIndex);
    }

    private String sanitizeIp(String ip) {
        if (ip == null || ip.isBlank()) return "unknown";
        return ip.replaceAll("[^a-zA-Z0-9.:]", "");
    }
}

