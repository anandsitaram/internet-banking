package com.demo.ib.users;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {
    private final JdbcTemplate jdbc;

    private static final RowMapper<UserRow> MAPPER = (ResultSet rs, int i) -> new UserRow(
        rs.getLong("id"), rs.getString("username"), rs.getString("email"), rs.getString("full_name"),
        rs.getString("password_hash"), rs.getString("status"), rs.getInt("failed_login_count"),
        instant(rs, "locked_until"), instant(rs, "last_login_at"), instant(rs, "created_at"));

    private static Instant instant(ResultSet rs, String col) throws SQLException {
        var ts = rs.getTimestamp(col);
        return ts == null ? null : ts.toInstant();
    }

    public UserRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<UserRow> findByUsername(String username) {
        return jdbc.query("SELECT * FROM ib_users WHERE lower(username) = lower(?)", MAPPER, username)
            .stream().findFirst();
    }

    public Optional<UserRow> findById(long id) {
        return jdbc.query("SELECT * FROM ib_users WHERE id = ?", MAPPER, id).stream().findFirst();
    }

    public List<UserRow> search(String q, int limit, long offset) {
        String like = like(q);
        return jdbc.query("""
            SELECT * FROM ib_users
             WHERE ? = '%%' OR username ILIKE ? OR email ILIKE ? OR full_name ILIKE ?
             ORDER BY id LIMIT ? OFFSET ?
            """, MAPPER, like, like, like, like, limit, offset);
    }

    public long count(String q) {
        String like = like(q);
        Long n = jdbc.queryForObject("""
            SELECT count(*) FROM ib_users
             WHERE ? = '%%' OR username ILIKE ? OR email ILIKE ? OR full_name ILIKE ?
            """, Long.class, like, like, like, like);
        return n == null ? 0 : n;
    }

    private static String like(String q) {
        if (q == null || q.isBlank()) return "%%";
        return "%" + q.trim().replace("%", "\\%").replace("_", "\\_") + "%";
    }

    public long insert(String username, String email, String fullName, String passwordHash) {
        Long id = jdbc.queryForObject("""
            INSERT INTO ib_users (username, email, full_name, password_hash)
            VALUES (?, ?, ?, ?) RETURNING id
            """, Long.class, username, email, fullName, passwordHash);
        return id == null ? -1 : id;
    }

    public void update(long id, String email, String fullName, String status) {
        jdbc.update("""
            UPDATE ib_users SET email = ?, full_name = ?, status = ?,
                   failed_login_count = CASE WHEN ? = 'ACTIVE' THEN 0 ELSE failed_login_count END,
                   locked_until = CASE WHEN ? = 'ACTIVE' THEN NULL ELSE locked_until END,
                   updated_at = now()
             WHERE id = ?
            """, email, fullName, status, status, status, id);
    }

    public void updatePassword(long id, String hash) {
        jdbc.update("UPDATE ib_users SET password_hash = ?, updated_at = now() WHERE id = ?", hash, id);
    }

    public void recordFailedLogin(long id, int maxAttempts, int lockMinutes) {
        jdbc.update("""
            UPDATE ib_users
               SET locked_until = CASE WHEN failed_login_count + 1 >= ?
                                       THEN now() + make_interval(mins => ?) ELSE locked_until END,
                   failed_login_count = CASE WHEN failed_login_count + 1 >= ? THEN 0
                                             ELSE failed_login_count + 1 END
             WHERE id = ?
            """, maxAttempts, lockMinutes, maxAttempts, id);
    }

    public void recordSuccessfulLogin(long id) {
        jdbc.update("UPDATE ib_users SET failed_login_count = 0, locked_until = NULL, last_login_at = now() WHERE id = ?", id);
    }

    public List<String> roleNames(long userId) {
        return jdbc.queryForList("""
            SELECT r.role_name FROM ib_user_roles ur JOIN ib_roles r ON r.id = ur.role_id
             WHERE ur.user_id = ? ORDER BY r.role_name
            """, String.class, userId);
    }

    public List<String> permissionCodes(long userId) {
        return jdbc.queryForList("""
            SELECT DISTINCT p.permission_code
              FROM ib_user_roles ur
              JOIN ib_role_permissions rp ON rp.role_id = ur.role_id
              JOIN ib_permissions p ON p.id = rp.permission_id
             WHERE ur.user_id = ? ORDER BY p.permission_code
            """, String.class, userId);
    }

    /** Replaces the user's roles with the given role names (unknown names are ignored by the INSERT). */
    public void setRoles(long userId, List<String> roleNames) {
        jdbc.update("DELETE FROM ib_user_roles WHERE user_id = ?", userId);
        for (String role : roleNames) {
            jdbc.update("INSERT INTO ib_user_roles (user_id, role_id) SELECT ?, id FROM ib_roles WHERE role_name = ?",
                userId, role);
        }
    }
}
