package com.demo.ib.transfers;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class TransferRepository {
    private final JdbcTemplate jdbc;

    public record TransferRequestRow(
        long id,
        long fromAccountId,
        long toAccountId,
        String toAccountName,
        String toAccountNumber,
        BigDecimal amount,
        String currency,
        String remarks,
        String status,
        String fineractTransferRef,
        long createdBy,
        String creatorUsername,
        Instant createdAt,
        Instant updatedAt,
        long version
    ) {}

    public record ApprovalRow(
        long id,
        long requestId,
        long initiatedBy,
        Long approvedBy,
        String decision,
        String comment,
        Instant decidedAt,
        Instant createdAt
    ) {}

    public TransferRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<String> findIdempotentResponse(long userId, String requestKey) {
        return jdbc.query(
            "SELECT response_reference FROM ib_idempotency_keys WHERE user_id = ? AND request_key = ?",
            (rs, i) -> rs.getString("response_reference"),
            userId, requestKey
        ).stream().findFirst();
    }

    public void saveIdempotentKey(long userId, String requestKey, String responseRef) {
        jdbc.update(
            "INSERT INTO ib_idempotency_keys (user_id, request_key, response_reference) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
            userId, requestKey, responseRef
        );
    }

    public BigDecimal sumTransfersForUserToday(long userId) {
        BigDecimal sum = jdbc.queryForObject("""
            SELECT COALESCE(sum(amount), 0)
              FROM ib_transfer_requests
             WHERE created_by = ?
               AND status IN ('COMPLETED', 'PENDING_APPROVAL', 'APPROVED')
               AND created_at >= date_trunc('day', now())
            """, BigDecimal.class, userId);
        return sum != null ? sum : BigDecimal.ZERO;
    }

    public long createTransferRequest(
        long fromAccountId,
        long toAccountId,
        String toAccountName,
        String toAccountNumber,
        BigDecimal amount,
        String currency,
        String remarks,
        String status,
        String fineractTransferRef,
        long createdBy
    ) {
        Long id = jdbc.queryForObject("""
            INSERT INTO ib_transfer_requests
                (from_account_id, to_account_id, to_account_name, to_account_number, amount, currency, remarks, status, fineract_transfer_ref, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
            """, Long.class, fromAccountId, toAccountId, toAccountName, toAccountNumber, amount, currency, remarks, status, fineractTransferRef, createdBy);
        return id != null ? id : -1;
    }

    public void updateStatus(long id, String status, String transferRef) {
        jdbc.update("""
            UPDATE ib_transfer_requests
               SET status = ?, fineract_transfer_ref = COALESCE(?, fineract_transfer_ref), updated_at = now(), version = version + 1
             WHERE id = ?
            """, status, transferRef, id);
    }

    public Optional<TransferRequestRow> findById(long id) {
        return jdbc.query("""
            SELECT t.id, t.from_account_id, t.to_account_id,
                   COALESCE(t.to_account_name, 'Beneficiary') as to_account_name,
                   COALESCE(t.to_account_number, t.to_account_id::text) as to_account_number,
                   t.amount, t.currency, t.remarks, t.status, t.fineract_transfer_ref,
                   t.created_by, u.username as creator_username, t.created_at, t.updated_at, t.version
              FROM ib_transfer_requests t
              JOIN ib_users u ON u.id = t.created_by
             WHERE t.id = ?
            """, (rs, i) -> new TransferRequestRow(
                rs.getLong("id"), rs.getLong("from_account_id"), rs.getLong("to_account_id"),
                rs.getString("to_account_name"), rs.getString("to_account_number"),
                rs.getBigDecimal("amount"), rs.getString("currency"), rs.getString("remarks"),
                rs.getString("status"), rs.getString("fineract_transfer_ref"),
                rs.getLong("created_by"), rs.getString("creator_username"),
                rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant(),
                rs.getLong("version")
            ), id).stream().findFirst();
    }

    public List<TransferRequestRow> listByUser(long userId) {
        return jdbc.query("""
            SELECT t.id, t.from_account_id, t.to_account_id,
                   COALESCE(t.to_account_name, 'Beneficiary') as to_account_name,
                   COALESCE(t.to_account_number, t.to_account_id::text) as to_account_number,
                   t.amount, t.currency, t.remarks, t.status, t.fineract_transfer_ref,
                   t.created_by, u.username as creator_username, t.created_at, t.updated_at, t.version
              FROM ib_transfer_requests t
              JOIN ib_users u ON u.id = t.created_by
             WHERE t.created_by = ?
             ORDER BY t.id DESC
            """, (rs, i) -> new TransferRequestRow(
                rs.getLong("id"), rs.getLong("from_account_id"), rs.getLong("to_account_id"),
                rs.getString("to_account_name"), rs.getString("to_account_number"),
                rs.getBigDecimal("amount"), rs.getString("currency"), rs.getString("remarks"),
                rs.getString("status"), rs.getString("fineract_transfer_ref"),
                rs.getLong("created_by"), rs.getString("creator_username"),
                rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant(),
                rs.getLong("version")
            ), userId);
    }

    public List<TransferRequestRow> listPendingApprovals() {
        return jdbc.query("""
            SELECT t.id, t.from_account_id, t.to_account_id,
                   COALESCE(t.to_account_name, 'Beneficiary') as to_account_name,
                   COALESCE(t.to_account_number, t.to_account_id::text) as to_account_number,
                   t.amount, t.currency, t.remarks, t.status, t.fineract_transfer_ref,
                   t.created_by, u.username as creator_username, t.created_at, t.updated_at, t.version
              FROM ib_transfer_requests t
              JOIN ib_users u ON u.id = t.created_by
             WHERE t.status = 'PENDING_APPROVAL'
             ORDER BY t.id ASC
            """, (rs, i) -> new TransferRequestRow(
                rs.getLong("id"), rs.getLong("from_account_id"), rs.getLong("to_account_id"),
                rs.getString("to_account_name"), rs.getString("to_account_number"),
                rs.getBigDecimal("amount"), rs.getString("currency"), rs.getString("remarks"),
                rs.getString("status"), rs.getString("fineract_transfer_ref"),
                rs.getLong("created_by"), rs.getString("creator_username"),
                rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant(),
                rs.getLong("version")
            ));
    }

    public long createApproval(long requestId, long initiatedBy) {
        Long id = jdbc.queryForObject("""
            INSERT INTO ib_approvals (request_id, initiated_by, decision)
            VALUES (?, ?, 'PENDING')
            RETURNING id
            """, Long.class, requestId, initiatedBy);
        return id != null ? id : -1;
    }

    public void recordDecision(long requestId, long approvedBy, String decision, String comment) {
        jdbc.update("""
            UPDATE ib_approvals
               SET approved_by = ?, decision = ?, comment = ?, decided_at = now()
             WHERE request_id = ? AND decision = 'PENDING'
            """, approvedBy, decision, comment, requestId);
    }
}
