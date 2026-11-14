package com.demo.ib.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

/**
 * Server-side session + CSRF (double-submit cookie) for a same-origin SPA.
 * The browser never holds credentials for Fineract and never receives a bearer token.
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
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JsonSecurityHandlers handlers,
                                    SecurityContextRepository contextRepository) throws Exception {
        CsrfTokenRequestAttributeHandler csrfHandler = new CsrfTokenRequestAttributeHandler();

        CookieCsrfTokenRepository csrfRepo = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfRepo.setCookiePath("/");

        http
            .csrf(c -> c.csrfTokenRepository(csrfRepo).csrfTokenRequestHandler(csrfHandler))
            .addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)
            .cors(AbstractHttpConfigurer::disable)            // same-origin only (nginx serves SPA and /api)
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .logout(AbstractHttpConfigurer::disable)          // handled (and audited) by AuthController
            .requestCache(rc -> rc.disable())
            .securityContext(sc -> sc.securityContextRepository(contextRepository))
            .headers(h -> h
                .contentTypeOptions(Customizer.withDefaults())
                .frameOptions(f -> f.deny())
                .referrerPolicy(r -> r.policy(
                    org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER)))
            .exceptionHandling(e -> e.authenticationEntryPoint(handlers).accessDeniedHandler(handlers))
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
