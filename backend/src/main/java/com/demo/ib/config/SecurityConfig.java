package com.demo.ib.config;

import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Stateless bearer-token authentication for the SPA.
 * Authorisation is enforced here (URL rules by role) and on controllers (@PreAuthorize by permission).
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origins:}") String allowedOrigins) {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .filter(origin -> !origin.isEmpty())
            .toList());
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key"));
        cors.setAllowCredentials(false);
        cors.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", cors);
        return source;
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JsonSecurityHandlers handlers,
                                    JwtAuthConverter jwtAuthConverter) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults())
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .logout(AbstractHttpConfigurer::disable)          // handled (and audited) by AuthController
            .requestCache(rc -> rc.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(h -> h
                .contentTypeOptions(Customizer.withDefaults())
                .frameOptions(f -> f.deny())
                .referrerPolicy(r -> r.policy(
                    org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER)))
            .exceptionHandling(e -> e.authenticationEntryPoint(handlers).accessDeniedHandler(handlers))
            .oauth2ResourceServer(oauth -> oauth
                .authenticationEntryPoint(handlers)
                .accessDeniedHandler(handlers)
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter)))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/error").permitAll()
                .requestMatchers("/api/v1/health", "/actuator/health", "/actuator/health/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/login", "/api/v1/auth/forgot-password").permitAll()
                .requestMatchers("/api/v1/auth/**").authenticated()
                .requestMatchers("/api/v1/admin/**", "/api/v1/fineract/**").hasRole("ADMIN")
                .requestMatchers("/api/v1/staff/**").hasAnyRole("BANK_USER", "ADMIN")
                .requestMatchers("/api/v1/customer/**", "/api/v1/beneficiaries/**", "/api/v1/transfers/**").hasAnyRole("CUSTOMER", "BANK_USER", "ADMIN")
                .anyRequest().denyAll());
        return http.build();
    }
}
