package com.finguard.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Resilient Rate Limiter mitigating brute-force attacks and credential abuse (T-02).
 * - Backed by Redis when available for distributed cluster deployments.
 * - Gracefully falls back to an in-memory sliding window when Redis is offline or unconfigured.
 * - Never fails open or crashes when Redis connection errors occur.
 */
@Component
public class LoginRateLimiter {

    private static final Logger log = LoggerFactory.getLogger(LoginRateLimiter.class);

    private final int maxAttempts;
    private final long windowSeconds;
    private final StringRedisTemplate redisTemplate;

    // Circuit breaker for Redis: if Redis fails, bypass it for 30s before retrying
    private final AtomicBoolean redisDegraded = new AtomicBoolean(false);
    private volatile Instant redisDegradedUntil = Instant.MIN;

    private static class AttemptRecord {
        int attempts;
        Instant windowStart;

        AttemptRecord(Instant now) {
            this.attempts = 1;
            this.windowStart = now;
        }
    }

    private final ConcurrentHashMap<String, AttemptRecord> inMemoryAttemptsMap = new ConcurrentHashMap<>();

    public LoginRateLimiter(
            @Autowired(required = false) StringRedisTemplate redisTemplate,
            @Value("${app.rate-limit.max-attempts:5}") int maxAttempts,
            @Value("${app.rate-limit.window-seconds:60}") long windowSeconds) {
        this.redisTemplate = redisTemplate;
        this.maxAttempts = maxAttempts;
        this.windowSeconds = windowSeconds;
    }

    public boolean isBlocked(String key) {
        if (key == null) return false;

        // Try Redis if configured and not marked degraded
        if (isRedisHealthy()) {
            try {
                String redisKey = "ratelimit:" + key;
                String val = redisTemplate.opsForValue().get(redisKey);
                if (val != null) {
                    int count = Integer.parseInt(val);
                    if (count >= maxAttempts) {
                        return true;
                    }
                }
            } catch (Exception ex) {
                markRedisDegraded(ex);
            }
        }

        // Resilient in-memory fallback
        AttemptRecord record = inMemoryAttemptsMap.get(key);
        if (record == null) return false;

        Instant now = Instant.now();
        if (now.isAfter(record.windowStart.plusSeconds(windowSeconds))) {
            inMemoryAttemptsMap.remove(key);
            return false;
        }

        return record.attempts >= maxAttempts;
    }

    public void recordFailedAttempt(String key) {
        if (key == null) return;

        // Try Redis first
        if (isRedisHealthy()) {
            try {
                String redisKey = "ratelimit:" + key;
                Long attempts = redisTemplate.opsForValue().increment(redisKey);
                if (attempts != null && attempts == 1) {
                    redisTemplate.expire(redisKey, Duration.ofSeconds(windowSeconds));
                }
            } catch (Exception ex) {
                markRedisDegraded(ex);
            }
        }

        // Always record in in-memory fallback map as well to maintain local consistency
        Instant now = Instant.now();
        inMemoryAttemptsMap.compute(key, (k, existing) -> {
            if (existing == null || now.isAfter(existing.windowStart.plusSeconds(windowSeconds))) {
                return new AttemptRecord(now);
            }
            existing.attempts++;
            return existing;
        });
    }

    public void reset(String key) {
        if (key == null) return;

        if (isRedisHealthy()) {
            try {
                redisTemplate.delete("ratelimit:" + key);
            } catch (Exception ex) {
                markRedisDegraded(ex);
            }
        }

        inMemoryAttemptsMap.remove(key);
    }

    public long getRetryAfterSeconds(String key) {
        if (key == null) return windowSeconds;

        if (isRedisHealthy()) {
            try {
                Long expire = redisTemplate.getExpire("ratelimit:" + key);
                if (expire != null && expire > 0) {
                    return expire;
                }
            } catch (Exception ex) {
                markRedisDegraded(ex);
            }
        }

        AttemptRecord record = inMemoryAttemptsMap.get(key);
        if (record != null) {
            long elapsed = Duration.between(record.windowStart, Instant.now()).toSeconds();
            long remaining = windowSeconds - elapsed;
            return Math.max(1, remaining);
        }
        return windowSeconds;
    }

    private boolean isRedisHealthy() {
        if (redisTemplate == null) return false;
        if (redisDegraded.get()) {
            if (Instant.now().isAfter(redisDegradedUntil)) {
                redisDegraded.set(false);
                return true;
            }
            return false;
        }
        return true;
    }

    private void markRedisDegraded(Exception ex) {
        if (!redisDegraded.get()) {
            log.warn("Redis rate limiter unavailable ({}). Gracefully falling back to in-memory sliding window.", ex.getMessage());
            redisDegraded.set(true);
        }
        redisDegradedUntil = Instant.now().plusSeconds(30);
    }
}
