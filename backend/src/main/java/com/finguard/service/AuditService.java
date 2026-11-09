package com.finguard.service;

import com.finguard.dto.AuditEventResponse;
import com.finguard.entity.AuditEvent;
import com.finguard.repository.AuditEventRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Immutable Audit Service for recording financial and security events (T-20).
 * Append-only; provides no update or delete operations.
 */
@Service
public class AuditService {

    private final AuditEventRepository auditEventRepository;

    public AuditService(AuditEventRepository auditEventRepository) {
        this.auditEventRepository = auditEventRepository;
    }

    @Transactional
    public AuditEvent recordEvent(
            UUID actorId,
            String eventType,
            String targetType,
            String targetId,
            String correlationId,
            String details) {
        return recordEvent(actorId, null, eventType, targetType, targetId, correlationId, details, "SUCCESS");
    }

    @Transactional
    public AuditEvent recordEvent(
            UUID actorId,
            String actorEmail,
            String eventType,
            String targetType,
            String targetId,
            String correlationId,
            String details,
            String status) {
        AuditEvent event = new AuditEvent(
                actorId,
                actorEmail,
                eventType,
                targetType,
                targetId,
                correlationId,
                details,
                status
        );
        return auditEventRepository.save(event);
    }

    @Transactional(readOnly = true)
    public Page<AuditEventResponse> getAuditTrail(
            String eventType,
            UUID actorId,
            String status,
            String query,
            Pageable pageable) {

        Specification<AuditEvent> spec = (root, q, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (eventType != null && !eventType.isBlank()) {
                predicates.add(cb.equal(root.get("eventType"), eventType.trim()));
            }

            if (actorId != null) {
                predicates.add(cb.equal(root.get("actorId"), actorId));
            }

            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status.trim()));
            }

            if (query != null && !query.isBlank()) {
                String searchPattern = "%" + query.trim().toLowerCase() + "%";
                Predicate emailMatch = cb.like(cb.lower(root.get("actorEmail")), searchPattern);
                Predicate detailsMatch = cb.like(cb.lower(root.get("details")), searchPattern);
                Predicate typeMatch = cb.like(cb.lower(root.get("eventType")), searchPattern);
                Predicate targetMatch = cb.like(cb.lower(root.get("targetType")), searchPattern);
                predicates.add(cb.or(emailMatch, detailsMatch, typeMatch, targetMatch));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return auditEventRepository.findAll(spec, pageable).map(AuditEventResponse::fromEntity);
    }
}
