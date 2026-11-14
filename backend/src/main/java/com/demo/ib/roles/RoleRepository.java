package com.demo.ib.roles;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RoleRepository {
    public record RoleView(long id, String name, String description, List<String> permissions) {}
    public record PermissionView(String code, String description) {}

    private final JdbcTemplate jdbc;

    public RoleRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean exists(String roleName) {
        Integer n = jdbc.queryForObject("SELECT count(*) FROM ib_roles WHERE role_name = ?", Integer.class, roleName);
        return n != null && n > 0;
    }

    public List<RoleView> listRoles() {
        Map<Long, RoleView> byId = new LinkedHashMap<>();
        jdbc.query("SELECT id, role_name, description FROM ib_roles ORDER BY id", rs -> {
            byId.put(rs.getLong("id"),
                new RoleView(rs.getLong("id"), rs.getString("role_name"), rs.getString("description"), new ArrayList<>()));
        });
        jdbc.query("""
            SELECT rp.role_id, p.permission_code FROM ib_role_permissions rp
              JOIN ib_permissions p ON p.id = rp.permission_id ORDER BY p.permission_code
            """, rs -> {
            RoleView r = byId.get(rs.getLong("role_id"));
            if (r != null) r.permissions().add(rs.getString("permission_code"));
        });
        return new ArrayList<>(byId.values());
    }

    public Optional<RoleView> find(long id) {
        return listRoles().stream().filter(r -> r.id() == id).findFirst();
    }

    public List<PermissionView> listPermissions() {
        return jdbc.query("SELECT permission_code, description FROM ib_permissions ORDER BY permission_code",
            (rs, i) -> new PermissionView(rs.getString("permission_code"), rs.getString("description")));
    }

    public void setPermissions(long roleId, List<String> codes) {
        jdbc.update("DELETE FROM ib_role_permissions WHERE role_id = ?", roleId);
        for (String code : codes) {
            jdbc.update("INSERT INTO ib_role_permissions (role_id, permission_id) "
                + "SELECT ?, id FROM ib_permissions WHERE permission_code = ?", roleId, code);
        }
    }
}
