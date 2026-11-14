package com.demo.ib.config;

import com.demo.ib.auth.AuthUser;
import com.demo.ib.users.UserRepository;
import com.demo.ib.users.UserRow;
import java.util.ArrayList;
import java.util.List;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class JwtAuthConverter implements Converter<Jwt, AbstractAuthenticationToken> {
    private final UserRepository users;

    public JwtAuthConverter(UserRepository users) {
        this.users = users;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        final long userId;
        try {
            userId = Long.parseLong(jwt.getSubject());
        } catch (NumberFormatException ex) {
            throw new BadCredentialsException("Invalid bearer token subject.", ex);
        }

        UserRow user = users.findById(userId)
            .filter(u -> "ACTIVE".equals(u.status()))
            .orElseThrow(() -> new BadCredentialsException("Token user is unavailable."));
        AuthUser principal = new AuthUser(user.id(), user.username(), user.email(), user.fullName(),
            users.roleNames(user.id()), users.permissionCodes(user.id()));
        List<GrantedAuthority> authorities = new ArrayList<>();
        principal.roles().forEach(role -> authorities.add(new SimpleGrantedAuthority("ROLE_" + role)));
        principal.permissions().forEach(permission -> authorities.add(new SimpleGrantedAuthority(permission)));
        return UsernamePasswordAuthenticationToken.authenticated(principal, jwt, authorities);
    }
}
