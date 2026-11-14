package com.demo.ib.admin;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/reports")
public class AdminReportsController {
    private final JdbcTemplate jdbc;

    public record ReportSummary(
        long totalTransfers,
        BigDecimal totalVolumeCompleted,
        BigDecimal totalVolumePending,
        Map<String, Long> statusCounts,
        List<Map<String, Object>> recentTransactions
    ) {}

    public AdminReportsController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/transactions")
    @PreAuthorize("hasAuthority('REPORT_READ') or hasRole('ADMIN')")
    public ReportSummary transactionReport() {
        Long total = jdbc.queryForObject("SELECT count(*) FROM ib_transfer_requests", Long.class);
        BigDecimal completedVol = jdbc.queryForObject(
            "SELECT COALESCE(sum(amount), 0) FROM ib_transfer_requests WHERE status = 'COMPLETED'", BigDecimal.class
        );
        BigDecimal pendingVol = jdbc.queryForObject(
            "SELECT COALESCE(sum(amount), 0) FROM ib_transfer_requests WHERE status = 'PENDING_APPROVAL'", BigDecimal.class
        );

        Map<String, Long> statusCounts = new java.util.LinkedHashMap<>();
        jdbc.query("SELECT status, count(*) as cnt FROM ib_transfer_requests GROUP BY status", (rs) -> {
            statusCounts.put(rs.getString("status"), rs.getLong("cnt"));
        });

        List<Map<String, Object>> recent = jdbc.queryForList("""
            SELECT t.id, t.from_account_id, t.to_account_id, t.to_account_name,
                   t.amount, t.currency, t.remarks, t.status, t.fineract_transfer_ref,
                   u.username as created_by_username, t.created_at
              FROM ib_transfer_requests t
              JOIN ib_users u ON u.id = t.created_by
             ORDER BY t.id DESC
             LIMIT 50
            """);

        return new ReportSummary(
            total != null ? total : 0,
            completedVol != null ? completedVol : BigDecimal.ZERO,
            pendingVol != null ? pendingVol : BigDecimal.ZERO,
            statusCounts,
            recent
        );
    }
}
