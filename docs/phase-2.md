# Phase 1.1 fixes and Phase 2 (authentication & authorisation)

## Fixed from the original Phase 1 scaffold

| Problem | Fix |
|---|---|
| Frontend build failed (no `@types/react`, `latest` everywhere, no lockfile) | Exact-pinned deps, `package-lock.json`, `npm ci`, strict TS. **Build verified.** |
| Wrong Fineract env var `FINERACT_HIKARI_DRIVER_CLASS_NAME` (ignored by Fineract) | `FINERACT_HIKARI_DRIVER_SOURCE_CLASS_NAME`; tenant timezone/identifier/description added |
| Fineract tag `1.16.1` could not be confirmed | Tag is now `FINERACT_IMAGE_TAG` (default `1.12.1`). **Confirm with `docker pull`.** |
| Hard-coded `OWNER fineract` in tenant init SQL | Shell init script using `$POSTGRES_USER` |
| Fineract published on host :8443 with default creds | `expose` only; reachable from the BFF alone |
| Unauthenticated, always-200 Fineract status | Admin-only; checks actuator health + service credentials; 503 when down |
| Open BFF endpoints, fake role dropdown | Spring Security, JWT bearer tokens, role + permission checks |
| Init SQL only on first volume creation | Flyway migrations (`V1` schema, `V2` roles/permissions) |
| Missing blueprint tables | All 13 `ib_*` tables created (only users/roles/permissions/audit used so far) |
| MUI/Axios missing; fake balances in UI | MUI + Axios; no fabricated financial data |
| Root container user, no `.dockerignore`, no health checks | Non-root backend, `.dockerignore`, backend health check, nginx security headers + CSP |

## Security design (Phase 2)

* Stateless HS256 JWT bearer tokens signed with `APP_JWT_SECRET`, with a 15 minute lifetime.
  The SPA keeps the access token in tab-scoped `sessionStorage` and calls `/auth/refresh` only while the user is active.
  User status, roles, and permissions are reloaded from the database for every authenticated request.
* CSRF protection is not needed for bearer tokens because browsers do not attach the Authorization header automatically.
* BCrypt (cost 12); unknown-user logins do equal work (no timing oracle); generic "invalid credentials" message.
* Lockout after 5 failures for 15 min; disabled/locked accounts refused; `refresh` re-checks status and issues a new token.
* Admin cannot disable or demote themselves; ADMIN role permissions are immutable.
* Every login, denial, user change, role change and password change is written to `ib_audit_logs` (no secrets stored).
* Default-deny: any endpoint not explicitly matched returns 403.

## Verification checklist (do these on first run)

- [ ] `docker pull apache/fineract:<tag>` succeeds
- [ ] `docker compose config` and `docker compose up --build` succeed
- [ ] `docker compose logs backend` shows Flyway applying V1, V2 and "Created bootstrap admin"
- [ ] `docker compose logs fineract` shows a clean start (no driver/tenant errors)
- [ ] http://localhost:3000 login works for the three roles
- [ ] Admin overview shows "Banking engine up" (otherwise inspect Fineract logs/credentials)
- [ ] `scripts/smoke-test.sh` reports `failed=0`
- [ ] Audit log shows LOGIN / ACCESS_DENIED events

## What was and was not verified when this was produced

* Verified: backend unit tests, frontend type-check and production build, smoke-test shell syntax, and Compose configuration.
* **Not verified:** the Docker stack was not started, and the Fineract environment variables were checked against Apache's published
  compose files rather than a running container.
* Unit tests cover password policy and JWT token signing/expiry claims. Add Testcontainers-based integration tests next
  (login, lockout, role denial, token rejection) before building Phase 3 on top.

## Known limitations / next steps

* Single role per user in the API (schema supports many).
* No create-role endpoint, no per-customer limits yet (Phase 5).
* Logout clears the browser's token; issued tokens remain usable until their short expiry unless the user is disabled.
* Customer/account linking (`ib_customer_profiles`, `ib_account_links`) starts in Phase 4 when staff create Fineract
  clients and savings accounts; Phase 3 then reads balances and transactions from Fineract.
