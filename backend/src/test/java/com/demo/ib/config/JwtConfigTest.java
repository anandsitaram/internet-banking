package com.demo.ib.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class JwtConfigTest {
    private final JwtConfig config = new JwtConfig();

    @Test
    void rejectsExamplePlaceholderSecret() {
        assertThrows(IllegalArgumentException.class,
            () -> config.jwtSecretKey("CHANGE-ME-Use-A-Unique-Secret-At-Least-32-Bytes"));
    }

    @Test
    void acceptsSecretWithAtLeast32Bytes() {
        assertEquals("HmacSHA256", config.jwtSecretKey("a-unique-secret-value-with-at-least-32-bytes").getAlgorithm());
    }
}
