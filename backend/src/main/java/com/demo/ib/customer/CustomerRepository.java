package com.demo.ib.customer;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CustomerRepository {
    private final JdbcTemplate jdbc;

    public record CustomerProfile(long id, long userId, long fineractClientId, String phone) {}

    public CustomerRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<CustomerProfile> findByUserId(long userId) {
        return jdbc.query(
            "SELECT id, user_id, fineract_client_id, phone FROM ib_customer_profiles WHERE user_id = ?",
            (rs, i) -> new CustomerProfile(rs.getLong("id"), rs.getLong("user_id"), rs.getLong("fineract_client_id"), rs.getString("phone")),
            userId
        ).stream().findFirst();
    }

    public Optional<CustomerProfile> findByClientId(long fineractClientId) {
        return jdbc.query(
            "SELECT id, user_id, fineract_client_id, phone FROM ib_customer_profiles WHERE fineract_client_id = ?",
            (rs, i) -> new CustomerProfile(rs.getLong("id"), rs.getLong("user_id"), rs.getLong("fineract_client_id"), rs.getString("phone")),
            fineractClientId
        ).stream().findFirst();
    }

    public void linkCustomerProfile(long userId, long fineractClientId, String phone) {
        jdbc.update(
            "INSERT INTO ib_customer_profiles (user_id, fineract_client_id, phone) VALUES (?, ?, ?) " +
            "ON CONFLICT (user_id) DO UPDATE SET fineract_client_id = EXCLUDED.fineract_client_id, phone = EXCLUDED.phone",
            userId, fineractClientId, phone
        );
    }

    public List<Long> findLinkedAccountIds(long userId) {
        return jdbc.queryForList(
            "SELECT fineract_savings_account_id FROM ib_account_links WHERE user_id = ? ORDER BY id",
            Long.class, userId
        );
    }

    public void linkAccount(long userId, long fineractSavingsAccountId) {
        jdbc.update(
            "INSERT INTO ib_account_links (user_id, fineract_savings_account_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
            userId, fineractSavingsAccountId
        );
    }

    public boolean isAccountOwnedByUser(long userId, long fineractSavingsAccountId) {
        Integer count = jdbc.queryForObject(
            "SELECT count(*) FROM ib_account_links WHERE user_id = ? AND fineract_savings_account_id = ?",
            Integer.class, userId, fineractSavingsAccountId
        );
        return count != null && count > 0;
    }
}
