package com.demo.ib.common;

import com.demo.ib.audit.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiExceptionHandler {
    private final AuditService audit;

    public ApiExceptionHandler(AuditService audit) {
        this.audit = audit;
    }

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ErrorBody> api(ApiException e) {
        return ResponseEntity.status(e.status()).body(ErrorBody.of(e.code(), e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorBody> invalid(MethodArgumentNotValidException e) {
        Map<String, String> fields = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors().forEach(f -> fields.putIfAbsent(f.getField(), f.getDefaultMessage()));
        return ResponseEntity.badRequest().body(new ErrorBody("VALIDATION_FAILED", "Request validation failed.", fields));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<ErrorBody> unreadable(Exception e) {
        return ResponseEntity.badRequest().body(ErrorBody.of("BAD_REQUEST", "Malformed request."));
    }

    /** Thrown by @PreAuthorize (URL-level denials are handled in JsonSecurityHandlers). */
    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ErrorBody> denied(AccessDeniedException e, HttpServletRequest request) {
        audit.recordDenied(request);
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ErrorBody.of("FORBIDDEN", "You do not have permission to perform this action."));
    }
}
