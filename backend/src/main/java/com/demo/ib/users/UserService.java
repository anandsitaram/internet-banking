package com.demo.ib.users;

import com.demo.ib.audit.AuditService;
import com.demo.ib.auth.AuthUser;
import com.demo.ib.auth.PasswordPolicy;
import com.demo.ib.common.ApiException;
import com.demo.ib.common.PageResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
    public static final Set<String> STATUSES = Set.of("ACTIVE", "LOCKED", "DISABLED");

    private final UserRepository users;
    private final com.demo.ib.roles.RoleRepository roles;
    private final PasswordEncoder encoder;
    private final AuditService audit;

    public UserService(UserRepository users, com.demo.ib.roles.RoleRepository roles,
                       PasswordEncoder encoder, AuditService audit) {
        this.users = users;
        this.roles = roles;
        this.encoder = encoder;
        this.audit = audit;
    }

    public PageResponse<UserView> list(String q, int page, int size) {
        int s = Math.min(Math.max(size, 1), 100);
        int p = Math.max(page, 0);
        List<UserView> items = users.search(q, s, (long) p * s).stream().map(this::view).toList();
        return new PageResponse<>(items, p, s, users.count(q));
    }

    public UserView view(UserRow u) {
        return new UserView(u.id(), u.username(), u.email(), u.fullName(), u.status(),
            users.roleNames(u.id()), u.lockedUntil(), u.lastLoginAt(), u.createdAt());
    }

    @Transactional
    public UserView create(String username, String email, String fullName, String role, String password,
                           AuthUser actor, HttpServletRequest request) {
        UserRow row = createInternal(username, email, fullName, role, password);
        audit.recordAs(actor, "USER_CREATED", "USER", String.valueOf(row.id()), "SUCCESS",
            Map.of("username", row.username(), "role", role), request);
        return view(row);
    }

    /** Shared by the API and the startup seeder (no HTTP context). Validates everything. */
    @Transactional
    public UserRow createInternal(String username, String email, String fullName, String role, String password) {
        requireRole(role);
        var violations = PasswordPolicy.violations(password, username);
        if (!violations.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "WEAK_PASSWORD", PasswordPolicy.describe(violations));
        }
        try {
            long id = users.insert(username.trim(), email.trim(), fullName.trim(), encoder.encode(password));
            users.setRoles(id, List.of(role));
            return users.findById(id).orElseThrow();
        } catch (DuplicateKeyException e) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_USER", "Username or email is already in use.");
        }
    }

    @Transactional
    public UserView update(long id, String email, String fullName, String role, String status,
                           String newPassword, AuthUser actor, HttpServletRequest request) {
        UserRow before = users.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found."));
        requireRole(role);
        if (!STATUSES.contains(status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_STATUS", "Status must be ACTIVE, LOCKED or DISABLED.");
        }
        if (actor != null && actor.id() == id && (!"ACTIVE".equals(status) || !"ADMIN".equals(role))) {
            throw new ApiException(HttpStatus.CONFLICT, "SELF_LOCKOUT",
                "You cannot disable or demote your own account.");
        }
        List<String> oldRoles = users.roleNames(id);
        try {
            users.update(id, email.trim(), fullName.trim(), status);
        } catch (DuplicateKeyException e) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_USER", "Email is already in use.");
        }
        users.setRoles(id, List.of(role));

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("username", before.username());
        if (!before.status().equals(status)) details.put("status", before.status() + "->" + status);
        if (!oldRoles.equals(List.of(role))) details.put("roles", oldRoles + "->" + List.of(role));

        if (newPassword != null && !newPassword.isBlank()) {
            var violations = PasswordPolicy.violations(newPassword, before.username());
            if (!violations.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "WEAK_PASSWORD", PasswordPolicy.describe(violations));
            }
            users.updatePassword(id, encoder.encode(newPassword));
            details.put("passwordReset", true);
        }
        audit.recordAs(actor, "USER_UPDATED", "USER", String.valueOf(id), "SUCCESS", details, request);
        return view(users.findById(id).orElseThrow());
    }

    private void requireRole(String role) {
        if (role == null || !roles.exists(role)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ROLE", "Unknown role.");
        }
    }
}
