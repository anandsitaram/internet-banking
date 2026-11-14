-- V3: System limits, transfer enhancements, and extended permissions

CREATE TABLE IF NOT EXISTS ib_system_limits (
    limit_code   VARCHAR(40) PRIMARY KEY,
    limit_value  NUMERIC(18,2) NOT NULL,
    description  VARCHAR(200),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO ib_system_limits (limit_code, limit_value, description) VALUES
    ('SINGLE_TRANSFER_LIMIT', 100000.00, 'Maximum amount allowed for a single fund transfer'),
    ('DAILY_TRANSFER_LIMIT', 500000.00, 'Maximum cumulative transfer volume allowed per customer per day'),
    ('APPROVAL_THRESHOLD', 25000.00, 'Transfer amount threshold requiring maker-checker approval by bank staff')
ON CONFLICT (limit_code) DO NOTHING;

-- Enhancements to beneficiaries and transfer requests
ALTER TABLE ib_beneficiaries ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) DEFAULT 'State Core Bank';
ALTER TABLE ib_beneficiaries ADD COLUMN IF NOT EXISTS nickname VARCHAR(60);

ALTER TABLE ib_transfer_requests ADD COLUMN IF NOT EXISTS to_account_name VARCHAR(120);
ALTER TABLE ib_transfer_requests ADD COLUMN IF NOT EXISTS to_account_number VARCHAR(60);

-- Extended permissions for limits and reports
INSERT INTO ib_permissions (permission_code, description) VALUES
    ('LIMITS_READ',  'View transaction limits and approval rules'),
    ('LIMITS_WRITE', 'Configure transaction limits and approval rules')
ON CONFLICT (permission_code) DO NOTHING;

INSERT INTO ib_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM ib_roles r JOIN ib_permissions p ON
    (r.role_name = 'ADMIN' AND p.permission_code IN ('LIMITS_READ', 'LIMITS_WRITE'))
ON CONFLICT DO NOTHING;
