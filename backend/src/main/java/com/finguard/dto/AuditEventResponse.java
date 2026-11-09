package com.finguard.dto;

import com.finguard.entity.AuditEvent;

import java.time.Instant;
import java.util.UUID;

public record AuditEventResponse(
        UUID id,
        UUID actorId,
        String actorEmail,
        String eventType,
        String targetType,
        String targetId,
        String correlationId,
        String details,
        String status,
        Instant createdAt
) {
    public static AuditEventResponse fromEntity(AuditEvent event) {
        return new AuditEventResponse(
                event.getId(),
                event.getActorId(),
                event.getActorEmail(),
                event.getEventType(),
                event.getTargetType(),
                event.getTargetId(),
                event.getCorrelationId(),
                event.getDetails(),
                event.getStatus(),
                event.getCreatedAt()
        );
    }
}

