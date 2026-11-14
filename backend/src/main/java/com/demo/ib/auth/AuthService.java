package com.demo.ib.auth;

import com.demo.ib.audit.AuditService;
import com.demo.ib.common.ApiException;
import com.demo.ib.users.UserRepository;
import com.demo.ib.users.UserRow;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final SecurityContextRepository contextRepository;
    private final AuditService audit;
    private final int maxFailed;
    private final int lockMinutes;
    private final String dummyHash;

    public AuthService(UserRepository users, PasswordEncoder encoder, SecurityContextRepository contextRepository,
                       AuditService audit, @Value("${app.max-failed-logins}") int maxFailed,
                       @Value("${app.lockout-minutes}") int lockMinutes) {
        this.users = users;
        this.encoder = encoder;
        this.contextRepository = contextRepository;
        this.audit = audit;
        this.maxFailed = maxFailed;
        this.lockMinutes = lockMinutes;
        this.dummyHash = encoder.encode("timing-equaliser-not-a-real-password");
    }

    public AuthUser login(String username, String password, HttpServletRequest request, HttpServletResponse response) {
        String ip = request.getRemoteAddr();
        Optional<UserRow> found = users.findByUsername(username.trim());
        if (found.isEmpty()) {
            encoder.matches(password, dummyHash);   // keep timing similar for unknown users
            audit.record(null, null, "LOGIN", "SESSION", null, "FAILURE", Map.of("reason", "UNKNOWN_USER"), ip);
            throw invalidCredentials();
        }
        UserRow u = found.get();
        if (u.lockedUntil() != null && u.lockedUntil().isAfter(Instant.now())) {
            audit.record(u.id(), u.username(), "LOGIN", "SESSION", null, "FAILURE", Map.of("reason", "TEMPORARILY_LOCKED"), ip);
            throw new ApiException(HttpStatus.LOCKED, "ACCOUNT_LOCKED",
                "Too many failed attempts. Try again in " + lockMinutes + " minutes.");
        }
        if (!encoder.matches(password, u.passwordHash())) {
            users.recordFailedLogin(u.id(), maxFailed, lockMinutes);
            audit.record(u.id(), u.username(), "LOGIN", "SESSION", null, "FAILURE", Map.of("reason", "BAD_PASSWORD"), ip);
            throw invalidCredentials();
        }
        if (!"ACTIVE".equals(u.status())) {
            audit.record(u.id(), u.username(), "LOGIN", "SESSION", null, "FAILURE", Map.of("reason", "STATUS_" + u.status()), ip);
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED",
                "This account is locked or disabled. Please contact the bank.");
        }
        users.recordSuccessfulLogin(u.id());
        AuthUser au = buildAuthUser(u);
        establishSession(au, request, response);
        audit.record(u.id(), u.username(), "LOGIN", "SESSION", null, "SUCCESS", Map.of(), ip);
        return au;
    }

    public void logout(AuthUser actor, HttpServletRequest request) {
        if (actor != null) audit.recordAs(actor, "LOGOUT", "SESSION", null, "SUCCESS", Map.of(), request);
        SecurityContextHolder.clearContext();
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
    }

    /**
     * Extends the idle timeout (the request itself touches the session) and reloads roles/permissions
     * so permission changes and account disablement apply without waiting for re-login.
     */
    public AuthUser refresh(AuthUser current, HttpServletRequest request, HttpServletResponse response) {
        UserRow u = users.findById(current.id()).orElse(null);
        if (u == null || !"ACTIVE".equals(u.status())) {
            logout(current, request);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Session is no longer valid.");
        }
        AuthUser fresh = buildAuthUser(u);
        saveContext(fresh, request, response);
        return fresh;
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

    private void establishSession(AuthUser au, HttpServletRequest request, HttpServletResponse response) {
        if (request.getSession(false) != null) {
            request.changeSessionId();          // prevent session fixation
        } else {
            request.getSession(true);
        }
        saveContext(au, request, response);
    }

    private void saveContext(AuthUser au, HttpServletRequest request, HttpServletResponse response) {
        List<GrantedAuthority> authorities = new ArrayList<>();
        au.roles().forEach(r -> authorities.add(new SimpleGrantedAuthority("ROLE_" + r)));
        au.permissions().forEach(p -> authorities.add(new SimpleGrantedAuthority(p)));
        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(au, null, authorities));
        SecurityContextHolder.setContext(ctx);
        contextRepository.saveContext(ctx, request, response);
    }
}
