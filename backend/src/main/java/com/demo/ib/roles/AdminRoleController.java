package com.demo.ib.roles;

import com.demo.ib.audit.AuditService;
import com.demo.ib.auth.AuthUser;
import com.demo.ib.common.ApiException;
import com.demo.ib.roles.RoleRepository.PermissionView;
import com.demo.ib.roles.RoleRepository.RoleView;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminRoleController {
    public record PermissionsRequest(@NotNull List<String> permissions) {}

    private final RoleRepository roles;
    private final AuditService audit;

    public AdminRoleController(RoleRepository roles, AuditService audit) {
        this.roles = roles;
        this.audit = audit;
    }

    @GetMapping("/roles")
    @PreAuthorize("hasAuthority('ROLES_READ')")
    public List<RoleView> roles() {
        return roles.listRoles();
    }

    @GetMapping("/permissions")
    @PreAuthorize("hasAuthority('ROLES_READ')")
    public List<PermissionView> permissions() {
        return roles.listPermissions();
    }

    /**
     * Permission changes take effect when a user's session is next refreshed or they log in again.
     * The ADMIN role is immutable so an administrator cannot lock everyone out.
     */
    @PutMapping("/roles/{id}/permissions")
    @PreAuthorize("hasAuthority('ROLES_WRITE')")
    @Transactional
    public RoleView setPermissions(@PathVariable long id, @Valid @RequestBody PermissionsRequest body,
                                   @AuthenticationPrincipal AuthUser actor, HttpServletRequest request) {
        RoleView role = roles.find(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ROLE_NOT_FOUND", "Role not found."));
        if ("ADMIN".equals(role.name())) {
            throw new ApiException(HttpStatus.CONFLICT, "ROLE_IMMUTABLE", "The ADMIN role cannot be modified.");
        }
        Set<String> known = roles.listPermissions().stream().map(PermissionView::code).collect(Collectors.toSet());
        Set<String> requested = new HashSet<>(body.permissions());
        if (!known.containsAll(requested)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "UNKNOWN_PERMISSION", "Unknown permission code.");
        }
        roles.setPermissions(id, List.copyOf(requested));
        RoleView after = roles.find(id).orElseThrow();
        audit.recordAs(actor, "ROLE_PERMISSIONS_UPDATED", "ROLE", String.valueOf(id), "SUCCESS",
            Map.of("role", role.name(), "before", role.permissions(), "after", after.permissions()), request);
        return after;
    }
}
