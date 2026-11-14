package com.demo.ib.audit;

import java.time.Instant;

public record AuditLogView(long id, Long actorUserId, String actorUsername, String action, String resourceType,
                           String resourceId, String outcome, String details, String ipAddress, Instant createdAt) {}
