-- Application-owned schema (blueprint section 4.1).
-- Balances and transactions live ONLY in Fineract; only Fineract ids are stored here.

CREATE TABLE ib_users (
    id                 BIGSERIAL PRIMARY KEY,
    username           VARCHAR(80)  NOT NULL,
    email              VARCHAR(254) NOT NULL,
    full_name          VARCHAR(120) NOT NULL,
    password_hash      VARCHAR(255) NOT NULL,
    status             VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                       CHECK (status IN ('ACTIVE', 'LOCKED', 'DISABLED')),
    failed_login_count INT          NOT NULL DEFAULT 0,
    locked_until       TIMESTAMPTZ,
    last_login_at      TIMESTAMPTZ,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_ib_users_username ON ib_users (lower(username));
CREATE UNIQUE INDEX ux_ib_users_email    ON ib_users (lower(email));

CREATE TABLE ib_roles (
    id          BIGSERIAL PRIMARY KEY,
    role_name   VARCHAR(40) NOT NULL UNIQUE,
    description VARCHAR(200)
);

CREATE TABLE ib_permissions (
    id              BIGSERIAL PRIMARY KEY,
    permission_code VARCHAR(60) NOT NULL UNIQUE,
    description     VARCHAR(200)
);

CREATE TABLE ib_user_roles (
    user_id BIGINT NOT NULL REFERENCES ib_users (id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES ib_roles (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE ib_role_permissions (
    role_id       BIGINT NOT NULL REFERENCES ib_roles (id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES ib_permissions (id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE ib_customer_profiles (
    id                 BIGSERIAL PRIMARY KEY,
    user_id            BIGINT NOT NULL UNIQUE REFERENCES ib_users (id) ON DELETE CASCADE,
    fineract_client_id BIGINT NOT NULL UNIQUE,
    phone              VARCHAR(30)
);

CREATE TABLE ib_account_links (
    id                          BIGSERIAL PRIMARY KEY,
    user_id                     BIGINT NOT NULL REFERENCES ib_users (id) ON DELETE CASCADE,
    fineract_savings_account_id BIGINT NOT NULL UNIQUE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_ib_account_links_user ON ib_account_links (user_id);

CREATE TABLE ib_beneficiaries (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT       NOT NULL REFERENCES ib_users (id) ON DELETE CASCADE,
    beneficiary_name  VARCHAR(120) NOT NULL,
    account_reference VARCHAR(60)  NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REMOVED')),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (user_id, account_reference)
);

CREATE TABLE ib_transfer_requests (
    id                    BIGSERIAL PRIMARY KEY,
    from_account_id       BIGINT        NOT NULL,
    to_account_id         BIGINT        NOT NULL,
    amount                NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    currency              CHAR(3)       NOT NULL,
    remarks               VARCHAR(200),
    status                VARCHAR(30)   NOT NULL
                          CHECK (status IN ('PENDING_APPROVAL','APPROVED','REJECTED','PROCESSING','COMPLETED','FAILED')),
    fineract_transfer_ref VARCHAR(60),
    created_by            BIGINT        NOT NULL REFERENCES ib_users (id),
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
    version               BIGINT        NOT NULL DEFAULT 0,   -- optimistic locking
    CHECK (from_account_id <> to_account_id)
);

CREATE TABLE ib_approvals (
    id           BIGSERIAL PRIMARY KEY,
    request_id   BIGINT      NOT NULL REFERENCES ib_transfer_requests (id),
    initiated_by BIGINT      NOT NULL REFERENCES ib_users (id),
    approved_by  BIGINT      REFERENCES ib_users (id),
    decision     VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (decision IN ('PENDING','APPROVED','REJECTED')),
    comment      VARCHAR(300),
    decided_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (approved_by IS NULL OR approved_by <> initiated_by)  -- maker-checker
);

CREATE TABLE ib_audit_logs (
    id             BIGSERIAL PRIMARY KEY,
    actor_user_id  BIGINT REFERENCES ib_users (id) ON DELETE SET NULL,
    actor_username VARCHAR(80),
    action         VARCHAR(100) NOT NULL,
    resource_type  VARCHAR(80),
    resource_id    VARCHAR(120),
    outcome        VARCHAR(30)  NOT NULL,
    details        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    ip_address     VARCHAR(64),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_ib_audit_created ON ib_audit_logs (created_at DESC);
CREATE INDEX ix_ib_audit_action  ON ib_audit_logs (action);

CREATE TABLE ib_idempotency_keys (
    id                 BIGSERIAL PRIMARY KEY,
    user_id            BIGINT       NOT NULL REFERENCES ib_users (id) ON DELETE CASCADE,
    request_key        VARCHAR(100) NOT NULL,
    request_hash       VARCHAR(64),
    response_reference VARCHAR(100),
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (user_id, request_key)
);

CREATE TABLE ib_notifications (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES ib_users (id) ON DELETE CASCADE,
    message     VARCHAR(400) NOT NULL,
    read_status BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
