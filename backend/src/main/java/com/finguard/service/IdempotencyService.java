package com.finguard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finguard.entity.IdempotencyRecord;
import com.finguard.entity.IdempotencyStatus;
import com.finguard.entity.User;
import com.finguard.exception.IdempotencyConflictException;
import com.finguard.repository.IdempotencyRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

/**
 * Service managing financial idempotency (T-08, T-09, IDEM-01 through IDEM-08).
 * Scopes keys per authenticated user, verifies request fingerprints,
 * and replays stored responses on duplicate requests.
 */
@Service
public class IdempotencyService {

    private static final Logger log = LoggerFactory.getLogger(IdempotencyService.class);

    private final IdempotencyRecordRepository repository;
    private final ObjectMapper objectMapper;

    public IdempotencyService(IdempotencyRecordRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    /**
     * Computes deterministic SHA-256 fingerprint for canonical request representation.
     */
    public String computeFingerprint(String canonicalString) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(canonicalString.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 digest algorithm not available", e);
        }
    }

    /**
     * Looks up existing idempotency record and validates fingerprint consistency.
     */
    @Transactional(readOnly = true)
    public Optional<IdempotencyRecord> findRecord(UUID userId, String idempotencyKey, String currentFingerprint) {
        Optional<IdempotencyRecord> opt = repository.findByUserIdAndIdempotencyKey(userId, idempotencyKey);
        if (opt.isPresent()) {
            IdempotencyRecord record = opt.get();
            if (!record.getRequestFingerprint().equals(currentFingerprint)) {
                log.warn("Idempotency conflict for user {} and key {}: stored={} current={}",
                        userId, idempotencyKey, record.getRequestFingerprint(), currentFingerprint);
                throw new IdempotencyConflictException(
                        "Idempotency key '" + idempotencyKey + "' was already used with a different request payload."
                );
            }
        }
        return opt;
    }

    /**
     * Records completed idempotency record with serialized response.
     */
    @Transactional
    public void recordSuccess(
            User user,
            String idempotencyKey,
            String fingerprint,
            Object responseObject,
            int statusCode) {
        try {
            String payloadJson = objectMapper.writeValueAsString(responseObject);
            IdempotencyRecord record = new IdempotencyRecord(user, idempotencyKey, fingerprint, IdempotencyStatus.COMPLETED);
            record.markCompleted(payloadJson, statusCode);
            repository.save(record);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize response for idempotency record key={}", idempotencyKey, e);
        } catch (DataIntegrityViolationException e) {
            log.warn("Concurrent duplicate insert caught on unique constraint for key={}", idempotencyKey);
        }
    }

    /**
     * Deserializes cached response object.
     */
    public <T> T deserializeResponse(String payload, Class<T> responseClass) {
        try {
            return objectMapper.readValue(payload, responseClass);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to deserialize cached idempotency payload", e);
        }
    }
}

