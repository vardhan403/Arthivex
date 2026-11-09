package com.finguard.security;

import com.finguard.entity.Role;
import com.finguard.entity.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SecurityException;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

/**
 * High-security JWT Service.
 * - Pinned to HMAC-SHA256 with 256-bit+ externalized secret.
 * - Enforces mandatory expiration.
 * - Strictly rejects alg=none and tampered signatures.
 * - Never includes passwords or financial details in claims.
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    private final String secretString;
    private final long expirationMinutes;
    private final String issuer;
    private SecretKey signingKey;

    public JwtService(
            @Value("${app.jwt.secret}") String secretString,
            @Value("${app.jwt.expiration-minutes:30}") long expirationMinutes,
            @Value("${app.jwt.issuer:finguard-auth-service}") String issuer) {
        this.secretString = secretString;
        this.expirationMinutes = expirationMinutes;
        this.issuer = issuer;
    }

    @PostConstruct
    public void init() {
        byte[] keyBytes = secretString.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException("JWT signing secret key must be at least 256 bits (32 bytes). Current length: " + keyBytes.length);
        }
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Generate an access token for an authenticated user.
     */
    public String generateToken(User user) {
        return generateToken(user.getId(), user.getEmail(), user.getRole(), expirationMinutes);
    }

    /**
     * Generate an access token with custom claims and expiration (used for production and test scenarios).
     */
    public String generateToken(UUID userId, String email, Role role, long minutesValid) {
        Instant now = Instant.now();
        Instant expiry = now.plus(minutesValid, ChronoUnit.MINUTES);

        return Jwts.builder()
                .issuer(issuer)
                .subject(userId.toString())
                .claim("email", email)
                .claim("role", role.name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(signingKey)
                .compact();
    }

    /**
     * Extracts subject (User UUID) from token.
     */
    public UUID extractUserId(String token) {
        Claims claims = extractAllClaims(token);
        return UUID.fromString(claims.getSubject());
    }

    /**
     * Extracts email claim from token.
     */
    public String extractEmail(String token) {
        Claims claims = extractAllClaims(token);
        return claims.get("email", String.class);
    }

    /**
     * Extracts role claim from token.
     */
    public Role extractRole(String token) {
        Claims claims = extractAllClaims(token);
        String roleStr = claims.get("role", String.class);
        return Role.valueOf(roleStr);
    }

    /**
     * Strictly validates token signature, expiration, and format.
     * Returns true if valid, false otherwise (never throws uncaught exception to caller).
     */
    public boolean validateToken(String token) {
        try {
            extractAllClaims(token);
            return true;
        } catch (ExpiredJwtException ex) {
            log.warn("JWT validation failed: Token is expired");
        } catch (MalformedJwtException ex) {
            log.warn("JWT validation failed: Token is malformed");
        } catch (SecurityException ex) {
            log.warn("JWT validation failed: Tampered or invalid cryptographic signature");
        } catch (UnsupportedJwtException ex) {
            log.warn("JWT validation failed: Unsupported algorithm or structure (e.g. alg=none)");
        } catch (IllegalArgumentException ex) {
            log.warn("JWT validation failed: Empty or null claims");
        }
        return false;
    }

    /**
     * Parses and cryptographically validates the signed JWT claims.
     */
    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public long getExpirationSeconds() {
        return expirationMinutes * 60;
    }

    public SecretKey getSigningKey() {
        return signingKey;
    }
}

