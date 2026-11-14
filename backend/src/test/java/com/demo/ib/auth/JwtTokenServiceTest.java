package com.demo.ib.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.time.Duration;
import java.time.Instant;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

class JwtTokenServiceTest {
    @Test
    void issuesSignedTokenWithUserSubjectAndExpiry() {
        SecretKey key = new SecretKeySpec(
            "0123456789abcdef0123456789abcdef".getBytes(java.nio.charset.StandardCharsets.UTF_8),
            "HmacSHA256");
        JwtEncoder encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        JwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        JwtTokenService tokens = new JwtTokenService(encoder, Duration.ofMinutes(15));

        var decoded = decoder.decode(tokens.issue(new AuthUser(7, "alex", "alex@example.com", "Alex", java.util.List.of(), java.util.List.of())));

        assertEquals("7", decoded.getSubject());
        assertTrue(decoded.getExpiresAt().isAfter(Instant.now()));
    }
}
