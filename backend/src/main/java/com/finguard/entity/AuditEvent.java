package com.finguard.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Immutable audit trail record for security- and financial-critical events (T-20).
 */
@Entity
@Table(name = "audit_events")
public class AuditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "actor_id")
    private UUID actorId;

    @NotBlank
    @Size(max = 64)
    @Column(name = "event_type", nullable = false, length = 64, updatable = false)
    private String eventType;

    @NotBlank
    @Size(max = 64)
    @Column(name = "target_type", nullable = false, length = 64, updatable = false)
    private String targetType;

    @Size(max = 64)
    @Column(name = "target_id", length = 64, updatable = false)
    private String targetId;

    @Size(max = 64)
    @Column(name = "correlation_id", length = 64, updatable = false)
    private String correlationId;

    @Size(max = 1000)
    @Column(name = "details", length = 1000, updatable = false)
    private String details;

    @Size(max = 32)
    @Column(name = "status", length = 32, updatable = false)
    private String status = "SUCCESS";

    @Size(max = 255)
    @Column(name = "actor_email", length = 255, updatable = false)
    private String actorEmail;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (status == null) {
            status = "SUCCESS";
        }
    }

    public AuditEvent() {
    }

    public AuditEvent(UUID actorId, String eventType, String targetType, String targetId, String correlationId, String details) {
        this(actorId, null, eventType, targetType, targetId, correlationId, details, "SUCCESS");
    }

    public AuditEvent(UUID actorId, String actorEmail, String eventType, String targetType, String targetId, String correlationId, String details, String status) {
        this.actorId = actorId;
        this.actorEmail = actorEmail;
        this.eventType = eventType;
        this.targetType = targetType;
        this.targetId = targetId;
        this.correlationId = correlationId;
        this.details = details;
        this.status = status != null ? status : "SUCCESS";
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getActorId() {
        return actorId;
    }

    public String getEventType() {
        return eventType;
    }

    public String getTargetType() {
        return targetType;
    }

    public String getTargetId() {
        return targetId;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public String getDetails() {
        return details;
    }

    public String getStatus() {
        return status;
    }

    public String getActorEmail() {
        return actorEmail;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AuditEvent that)) return false;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}

