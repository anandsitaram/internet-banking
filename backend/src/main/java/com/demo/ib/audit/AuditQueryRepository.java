package com.demo.ib.audit;

import com.demo.ib.common.PageResponse;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AuditQueryRepository {
    private final JdbcTemplate jdbc;

    public AuditQueryRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public PageResponse<AuditLogView> search(String action, String outcome, String actor, int page, int size) {
        StringBuilder where = new StringBuilder(" WHERE 1=1");
        List<Object> args = new ArrayList<>();
        if (action != null && !action.isBlank()) { where.append(" AND action = ?"); args.add(action.trim()); }
        if (outcome != null && !outcome.isBlank()) { where.append(" AND outcome = ?"); args.add(outcome.trim()); }
        if (actor != null && !actor.isBlank()) {
            where.append(" AND actor_username ILIKE ?");
            args.add("%" + actor.trim().replace("%", "\\%").replace("_", "\\_") + "%");
        }
        Long total = jdbc.queryForObject("SELECT count(*) FROM ib_audit_logs" + where, Long.class, args.toArray());

        List<Object> pageArgs = new ArrayList<>(args);
        pageArgs.add(size);
        pageArgs.add((long) page * size);
        List<AuditLogView> rows = jdbc.query(
            "SELECT id, actor_user_id, actor_username, action, resource_type, resource_id, outcome, "
                + "details::text AS details, ip_address, created_at FROM ib_audit_logs" + where
                + " ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
            (rs, i) -> new AuditLogView(rs.getLong("id"),
                (Long) rs.getObject("actor_user_id"), rs.getString("actor_username"), rs.getString("action"),
                rs.getString("resource_type"), rs.getString("resource_id"), rs.getString("outcome"),
                rs.getString("details"), rs.getString("ip_address"),
                rs.getTimestamp("created_at").toInstant()),
            pageArgs.toArray());
        return new PageResponse<>(rows, page, size, total == null ? 0 : total);
    }
}
