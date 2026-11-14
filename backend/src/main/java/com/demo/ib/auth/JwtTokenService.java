package com.demo.ib.auth;

import java.time.Duration;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

@Service
public class JwtTokenService {
    private final JwtEncoder encoder;
    private final Duration lifetime;

    public JwtTokenService(JwtEncoder encoder, @Value("${app.jwt.lifetime}") Duration lifetime) {
        if (lifetime.isZero() || lifetime.isNegative()) {
            throw new IllegalArgumentException("JWT lifetime must be positive.");
        }
        this.encoder = encoder;
        this.lifetime = lifetime;
    }

    public String issue(AuthUser user) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuer("internet-banking")
            .issuedAt(now)
            .expiresAt(now.plus(lifetime))
            .subject(String.valueOf(user.id()))
            .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    public int lifetimeSeconds() {
        return Math.toIntExact(lifetime.toSeconds());
    }
}
