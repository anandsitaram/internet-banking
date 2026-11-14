package com.demo.ib.admin;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/overview")
public class AdminOverviewController {
    private final JdbcTemplate jdbc;

    public AdminOverviewController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('USER_READ')")
    public Map<String, Object> overview() {
        Map<String, Object> usersByRole = new LinkedHashMap<>();
        jdbc.query("""
            SELECT r.role_name, count(ur.user_id) AS n FROM ib_roles r
              LEFT JOIN ib_user_roles ur ON ur.role_id = r.id GROUP BY r.role_name ORDER BY r.role_name
            """, rs -> { usersByRole.put(rs.getString("role_name"), rs.getLong("n")); });
        Long locked = jdbc.queryForObject(
            "SELECT count(*) FROM ib_users WHERE status <> 'ACTIVE' OR (locked_until IS NOT NULL AND locked_until > now())",
            Long.class);
        Long failed24h = jdbc.queryForObject("""
            SELECT count(*) FROM ib_audit_logs
             WHERE action = 'LOGIN' AND outcome = 'FAILURE' AND created_at > now() - interval '24 hours'
            """, Long.class);
        Long denied24h = jdbc.queryForObject("""
            SELECT count(*) FROM ib_audit_logs
             WHERE action = 'ACCESS_DENIED' AND created_at > now() - interval '24 hours'
            """, Long.class);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("usersByRole", usersByRole);
        out.put("inactiveOrLockedUsers", locked);
        out.put("failedLogins24h", failed24h);
        out.put("accessDenied24h", denied24h);
        return out;
    }
}
