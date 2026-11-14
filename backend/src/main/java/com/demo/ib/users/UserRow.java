package com.demo.ib.users;

import java.time.Instant;

public record UserRow(long id, String username, String email, String fullName, String passwordHash,
                      String status, int failedLoginCount, Instant lockedUntil, Instant lastLoginAt,
                      Instant createdAt) {}
