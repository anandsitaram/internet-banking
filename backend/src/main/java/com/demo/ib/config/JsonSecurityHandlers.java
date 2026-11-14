package com.demo.ib.config;

import com.demo.ib.audit.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/** JSON 401/403 responses (no redirects, no HTML) for the SPA. Denials are audited. */
@Component
public class JsonSecurityHandlers implements AuthenticationEntryPoint, AccessDeniedHandler {
    private final AuditService audit;

    public JsonSecurityHandlers(AuditService audit) {
        this.audit = audit;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException ex)
            throws IOException {
        write(response, 401, "{\"error\":\"UNAUTHENTICATED\",\"message\":\"Authentication required or bearer token expired.\"}");
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException ex)
            throws IOException {
        audit.recordDenied(request);
        write(response, 403, "{\"error\":\"FORBIDDEN\",\"message\":\"You do not have permission to perform this action.\"}");
    }

    private static void write(HttpServletResponse response, int status, String json) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(json);
    }
}
