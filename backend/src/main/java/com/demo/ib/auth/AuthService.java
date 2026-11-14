package com.demo.ib.auth;

import com.demo.ib.audit.AuditService;
import com.demo.ib.common.ApiException;
import com.demo.ib.users.UserRepository;
import com.demo.ib.users.UserRow;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtTokenService tokens;
    private final AuditService audit;
    private final int maxFailed;
    private final int lockMinutes;
    private final String dummyHash;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtTokenService tokens,
                       AuditService audit, @Value("${app.max-failed-logins}") int maxFailed,
                       @Value("${app.lockout-minutes}") int lockMinutes) {
        this.users = users;
        this.encoder = encoder;
        this.tokens = tokens;
        this.audit = audit;
        this.maxFailed = maxFailed;
        this.lockMinutes = lockMinutes;
        this.dummyHash = encoder.encode("timing-equaliser-not-a-real-password");
    }

    public AuthUser login(String username, String password, HttpServletRequest request) {
        String ip = request.getRemoteAddr();
        Optional<UserRow> found = users.findByUsername(username.trim());
        if (found.isEmpty()) {
            encoder.matches(password, dummyHash);   // keep timing similar for unknown users
            audit.record(null, null, "LOGIN", "AUTH_TOKEN", null, "FAILURE", Map.of("reason", "UNKNOWN_USER"), ip);
            throw invalidCredentials();
        }
        UserRow u = found.get();
        if (u.lockedUntil() != null && u.lockedUntil().isAfter(Instant.now())) {
            audit.record(u.id(), u.username(), "LOGIN", "AUTH_TOKEN", null, "FAILURE", Map.of("reason", "TEMPORARILY_LOCKED"), ip);
            throw new ApiException(HttpStatus.LOCKED, "ACCOUNT_LOCKED",
                "Too many failed attempts. Try again in " + lockMinutes + " minutes.");
        }
        if (!encoder.matches(password, u.passwordHash())) {
            users.recordFailedLogin(u.id(), maxFailed, lockMinutes);
            audit.record(u.id(), u.username(), "LOGIN", "AUTH_TOKEN", null, "FAILURE", Map.of("reason", "BAD_PASSWORD"), ip);
            throw invalidCredentials();
        }
        if (!"ACTIVE".equals(u.status())) {
            audit.record(u.id(), u.username(), "LOGIN", "AUTH_TOKEN", null, "FAILURE", Map.of("reason", "STATUS_" + u.status()), ip);
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED",
                "This account is locked or disabled. Please contact the bank.");
        }
        users.recordSuccessfulLogin(u.id());
        AuthUser au = buildAuthUser(u);
        audit.record(u.id(), u.username(), "LOGIN", "AUTH_TOKEN", null, "SUCCESS", Map.of(), ip);
        return au;
    }

    public void logout(AuthUser actor, HttpServletRequest request) {
        if (actor != null) audit.recordAs(actor, "LOGOUT", "AUTH_TOKEN", null, "SUCCESS", Map.of(), request);
        SecurityContextHolder.clearContext();
    }

    /** Reloads the current account and permissions before issuing a replacement token. */
    public AuthUser refresh(AuthUser current, HttpServletRequest request) {
        UserRow u = users.findById(current.id()).orElse(null);
        if (u == null || !"ACTIVE".equals(u.status())) {
            logout(current, request);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Token is no longer valid.");
        }
        return buildAuthUser(u);
    }

    public String issueAccessToken(AuthUser user) {
        return tokens.issue(user);
    }

    public int tokenLifetimeSeconds() {
        return tokens.lifetimeSeconds();
    }

    public void changePassword(AuthUser actor, String currentPassword, String newPassword, HttpServletRequest request) {
        UserRow u = users.findById(actor.id()).orElseThrow();
        if (!encoder.matches(currentPassword, u.passwordHash())) {
            audit.recordAs(actor, "PASSWORD_CHANGE", "USER", String.valueOf(actor.id()), "FAILURE",
                Map.of("reason", "BAD_CURRENT_PASSWORD"), request);
            throw new ApiException(HttpStatus.BAD_REQUEST, "BAD_CURRENT_PASSWORD", "Current password is incorrect.");
        }
        List<String> violations = PasswordPolicy.violations(newPassword, u.username());
        if (!violations.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "WEAK_PASSWORD", PasswordPolicy.describe(violations));
        }
        users.updatePassword(u.id(), encoder.encode(newPassword));
        audit.recordAs(actor, "PASSWORD_CHANGE", "USER", String.valueOf(actor.id()), "SUCCESS", Map.of(), request);
    }

    private ApiException invalidCredentials() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid username or password.");
    }

    private AuthUser buildAuthUser(UserRow u) {
        return new AuthUser(u.id(), u.username(), u.email(), u.fullName(),
            users.roleNames(u.id()), users.permissionCodes(u.id()));
    }

}
