package com.demo.ib.audit;

import com.demo.ib.auth.AuthUser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/** Writes append-only audit events to the application database. Never put secrets in details. */
@Service
public class AuditService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public AuditService(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    public void record(Long actorId, String actorUsername, String action, String resourceType,
                       String resourceId, String outcome, Map<String, Object> details, String ip) {
        String json;
        try {
            json = mapper.writeValueAsString(details == null ? Map.of() : details);
        } catch (JsonProcessingException e) {
            json = "{}";
        }
        jdbc.update("""
            INSERT INTO ib_audit_logs
              (actor_user_id, actor_username, action, resource_type, resource_id, outcome, details, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?)
            """, actorId, actorUsername, action, resourceType, resourceId, outcome, json, ip);
    }

    /** Record an event for the currently authenticated user (or anonymous). */
    public void recordAs(AuthUser actor, String action, String resourceType, String resourceId,
                         String outcome, Map<String, Object> details, HttpServletRequest request) {
        record(actor == null ? null : actor.id(), actor == null ? null : actor.username(),
            action, resourceType, resourceId, outcome, details, request == null ? null : request.getRemoteAddr());
    }

    public void recordDenied(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        AuthUser actor = auth != null && auth.getPrincipal() instanceof AuthUser u ? u : null;
        recordAs(actor, "ACCESS_DENIED", "ENDPOINT", null, "DENIED",
            Map.of("method", request.getMethod(), "path", request.getRequestURI()), request);
    }
}
