package com.demo.ib.users;

import java.time.Instant;
import java.util.List;

public record UserView(long id, String username, String email, String fullName, String status,
                       List<String> roles, Instant lockedUntil, Instant lastLoginAt, Instant createdAt) {}
