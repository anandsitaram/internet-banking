package com.demo.ib.transfers;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class BeneficiaryRepository {
    private final JdbcTemplate jdbc;

    public record BeneficiaryRow(
        long id,
        long userId,
        String beneficiaryName,
        String accountReference,
        String bankName,
        String nickname,
        String status,
        Instant createdAt
    ) {}

    public BeneficiaryRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<BeneficiaryRow> listByUser(long userId) {
        return jdbc.query("""
            SELECT id, user_id, beneficiary_name, account_reference,
                   COALESCE(bank_name, 'State Core Bank') as bank_name,
                   COALESCE(nickname, beneficiary_name) as nickname,
                   status, created_at
              FROM ib_beneficiaries
             WHERE user_id = ? AND status = 'ACTIVE'
             ORDER BY id DESC
            """, (rs, i) -> new BeneficiaryRow(
                rs.getLong("id"), rs.getLong("user_id"), rs.getString("beneficiary_name"),
                rs.getString("account_reference"), rs.getString("bank_name"), rs.getString("nickname"),
                rs.getString("status"), rs.getTimestamp("created_at").toInstant()
            ), userId);
    }

    public Optional<BeneficiaryRow> findById(long userId, long id) {
        return jdbc.query("""
            SELECT id, user_id, beneficiary_name, account_reference,
                   COALESCE(bank_name, 'State Core Bank') as bank_name,
                   COALESCE(nickname, beneficiary_name) as nickname,
                   status, created_at
              FROM ib_beneficiaries
             WHERE user_id = ? AND id = ?
            """, (rs, i) -> new BeneficiaryRow(
                rs.getLong("id"), rs.getLong("user_id"), rs.getString("beneficiary_name"),
                rs.getString("account_reference"), rs.getString("bank_name"), rs.getString("nickname"),
                rs.getString("status"), rs.getTimestamp("created_at").toInstant()
            ), userId, id).stream().findFirst();
    }

    public long insert(long userId, String name, String accountReference, String bankName, String nickname) {
        Long id = jdbc.queryForObject("""
            INSERT INTO ib_beneficiaries (user_id, beneficiary_name, account_reference, bank_name, nickname, status)
            VALUES (?, ?, ?, ?, ?, 'ACTIVE')
            ON CONFLICT (user_id, account_reference)
            DO UPDATE SET beneficiary_name = EXCLUDED.beneficiary_name, bank_name = EXCLUDED.bank_name,
                          nickname = EXCLUDED.nickname, status = 'ACTIVE'
            RETURNING id
            """, Long.class, userId, name.trim(), accountReference.trim(),
            bankName != null ? bankName.trim() : "State Core Bank",
            nickname != null ? nickname.trim() : name.trim()
        );
        return id != null ? id : -1;
    }

    public void remove(long userId, long id) {
        jdbc.update("UPDATE ib_beneficiaries SET status = 'REMOVED' WHERE user_id = ? AND id = ?", userId, id);
    }
}
