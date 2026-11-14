package com.demo.ib.auth;

import java.io.Serializable;
import java.util.List;

/** Authenticated principal stored in the server-side session. Contains no secrets. */
public record AuthUser(long id, String username, String email, String fullName,
                       List<String> roles, List<String> permissions) implements Serializable {}
