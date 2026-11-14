package com.demo.ib.admin;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class LimitsRepository {
    private final JdbcTemplate jdbc;

    public record SystemLimit(String code, BigDecimal value, String description) {}

    public LimitsRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<SystemLimit> listLimits() {
        return jdbc.query(
            "SELECT limit_code, limit_value, description FROM ib_system_limits ORDER BY limit_code",
            (rs, i) -> new SystemLimit(rs.getString("limit_code"), rs.getBigDecimal("limit_value"), rs.getString("description"))
        );
    }

    public BigDecimal getLimitValue(String code, BigDecimal defaultValue) {
        List<BigDecimal> val = jdbc.query(
            "SELECT limit_value FROM ib_system_limits WHERE limit_code = ?",
            (rs, i) -> rs.getBigDecimal("limit_value"),
            code
        );
        return val.isEmpty() ? defaultValue : val.get(0);
    }

    public void updateLimit(String code, BigDecimal value) {
        jdbc.update("UPDATE ib_system_limits SET limit_value = ?, updated_at = now() WHERE limit_code = ?", value, code);
    }
}
