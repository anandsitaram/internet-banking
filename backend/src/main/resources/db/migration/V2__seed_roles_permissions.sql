INSERT INTO ib_roles (role_name, description) VALUES
  ('CUSTOMER',  'Banking customer using the self-service portal'),
  ('BANK_USER', 'Bank staff: onboarding, accounts and approvals'),
  ('ADMIN',     'Administrator: users, roles, limits, audit and reports');

INSERT INTO ib_permissions (permission_code, description) VALUES
  ('USER_READ',         'View portal users'),
  ('USER_WRITE',        'Create and update portal users'),
  ('ROLES_READ',         'View roles and permissions'),
  ('ROLES_WRITE',        'Change role permissions'),
  ('AUDIT_READ',        'View audit logs'),
  ('REPORT_READ',       'View transaction reports'),
  ('FINERACT_STATUS',   'View banking-engine connectivity'),
  ('CUSTOMER_REGISTER', 'Register customers'),
  ('CUSTOMER_READ',     'Search and view customers'),
  ('ACCOUNT_OPEN',      'Open savings accounts'),
  ('APPROVAL_DECIDE',   'Approve or reject pending requests'),
  ('ACCOUNT_VIEW_OWN',  'View own accounts and transactions'),
  ('TRANSFER_CREATE',   'Initiate fund transfers'),
  ('BENEFICIARY_MANAGE','Manage own beneficiaries'),
  ('STATEMENT_DOWNLOAD','Download own statements');

INSERT INTO ib_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM ib_roles r JOIN ib_permissions p ON
  (r.role_name = 'ADMIN' AND p.permission_code IN
     ('USER_READ','USER_WRITE','ROLES_READ','ROLES_WRITE','AUDIT_READ','REPORT_READ','FINERACT_STATUS'))
  OR (r.role_name = 'BANK_USER' AND p.permission_code IN
     ('CUSTOMER_REGISTER','CUSTOMER_READ','ACCOUNT_OPEN','APPROVAL_DECIDE'))
  OR (r.role_name = 'CUSTOMER' AND p.permission_code IN
     ('ACCOUNT_VIEW_OWN','TRANSFER_CREATE','BENEFICIARY_MANAGE','STATEMENT_DOWNLOAD'));
