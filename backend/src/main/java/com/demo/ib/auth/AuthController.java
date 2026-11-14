package com.demo.ib.auth;

import com.demo.ib.audit.AuditService;
import com.demo.ib.common.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    public record LoginRequest(@NotBlank @Size(max = 254) String username, @NotBlank @Size(max = 128) String password) {}
    public record ForgotPasswordRequest(@NotBlank @Size(max = 254) String usernameOrEmail) {}
    public record ChangePasswordRequest(@NotBlank @Size(max = 128) String currentPassword,
                                        @NotBlank @Size(max = 128) String newPassword) {}
    public record SessionInfo(AuthUser user, String accessToken, int expiresInSeconds) {}

    private final AuthService auth;
    private final AuditService audit;

    public AuthController(AuthService auth, AuditService audit) {
        this.auth = auth;
        this.audit = audit;
    }

    @PostMapping("/login")
    public SessionInfo login(@Valid @RequestBody LoginRequest body, HttpServletRequest request) {
        AuthUser user = auth.login(body.username(), body.password(), request);
        return session(user);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal AuthUser user, HttpServletRequest request) {
        auth.logout(user, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/refresh")
    public SessionInfo refresh(@AuthenticationPrincipal AuthUser user, HttpServletRequest request) {
        AuthUser fresh = auth.refresh(user, request);
        return session(fresh);
    }

    @GetMapping("/me")
    public SessionInfo me(@AuthenticationPrincipal AuthUser user) {
        return session(user);
    }

    /**
     * Demo: there is no mail server, so nothing is sent. The response is identical whether or not the
     * account exists (no account enumeration). Replace with a real, token-based flow before real use.
     */
    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest body, HttpServletRequest request) {
        audit.recordAs(null, "PASSWORD_RESET_REQUESTED", "USER", null, "ACCEPTED", Map.of(), request);
        return Map.of("message",
            "If the account exists, reset instructions would be sent. (Demo: email delivery is not configured; "
                + "ask an administrator to reset your password.)");
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest body,
                                               @AuthenticationPrincipal AuthUser user, HttpServletRequest request) {
        if (user == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Authentication required.");
        auth.changePassword(user, body.currentPassword(), body.newPassword(), request);
        return ResponseEntity.noContent().build();
    }

    private SessionInfo session(AuthUser user) {
        return new SessionInfo(user, auth.issueAccessToken(user), auth.tokenLifetimeSeconds());
    }
}
