import type {
  AccountSummaryView, AuditLogView, BeneficiaryView, PendingApprovalView, SystemLimit,
  TransactionView, UserView,
} from '../types'

const STORAGE_PREFIX = 'ib_mock_'

function load<T>(key: string, defaultVal: T): T {
  try {
    const s = localStorage.getItem(STORAGE_PREFIX + key)
    return s ? JSON.parse(s) : defaultVal
  } catch {
    return defaultVal
  }
}

function save<T>(key: string, val: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val))
  } catch {
    // ignore
  }
}

export const initialMockAccounts: AccountSummaryView[] = [
  {
    id: 10001,
    accountNumber: 'SAV-10001',
    clientId: 1,
    clientName: 'Alex Demo',
    productName: 'Standard Demo Savings',
    status: 'ACTIVE',
    balance: 145250,
    availableBalance: 145250,
    currency: 'INR',
    interestRate: 3.5,
    openDate: '2026-01-15',
    branchName: 'Mumbai Main Branch',
  },
  {
    id: 10002,
    accountNumber: 'SAL-10002',
    clientId: 1,
    clientName: 'Alex Demo',
    productName: 'High-Yield Salary Reserve',
    status: 'ACTIVE',
    balance: 380000,
    availableBalance: 380000,
    currency: 'INR',
    interestRate: 4.25,
    openDate: '2026-02-01',
    branchName: 'Mumbai Main Branch',
  },
]

export const initialMockTransactions: Record<number, TransactionView[]> = {
  10001: [
    {
      id: 104,
      accountId: 10001,
      transactionType: 'WITHDRAWAL',
      amount: 14750,
      currency: 'INR',
      runningBalance: 145250,
      date: '2026-11-12',
      remarks: 'Retail Grocery POS Payment',
      reference: 'TXN-POS-3391',
    },
    {
      id: 103,
      accountId: 10001,
      transactionType: 'WITHDRAWAL',
      amount: 15000,
      currency: 'INR',
      runningBalance: 160000,
      date: '2026-11-08',
      remarks: 'ATM Cash Withdrawal',
      reference: 'TXN-ATM-4412',
    },
    {
      id: 102,
      accountId: 10001,
      transactionType: 'DEPOSIT',
      amount: 75000,
      currency: 'INR',
      runningBalance: 175000,
      date: '2026-11-05',
      remarks: 'Monthly Salary Credit (TechCorp)',
      reference: 'TXN-SAL-9821',
    },
    {
      id: 101,
      accountId: 10001,
      transactionType: 'DEPOSIT',
      amount: 100000,
      currency: 'INR',
      runningBalance: 100000,
      date: '2026-11-01',
      remarks: 'Opening Balance Deposit',
      reference: 'TXN-INIT-001',
    },
  ],
  10002: [
    {
      id: 202,
      accountId: 10002,
      transactionType: 'DEPOSIT',
      amount: 30000,
      currency: 'INR',
      runningBalance: 380000,
      date: '2026-11-01',
      remarks: 'Accrued Quarterly Interest',
      reference: 'TXN-INT-099',
    },
    {
      id: 201,
      accountId: 10002,
      transactionType: 'DEPOSIT',
      amount: 350000,
      currency: 'INR',
      runningBalance: 350000,
      date: '2026-10-15',
      remarks: 'Term Reserve Allocation',
      reference: 'TXN-RES-011',
    },
  ],
}

export const initialMockBeneficiaries: BeneficiaryView[] = [
  {
    id: 1,
    userId: 3,
    beneficiaryName: 'Priya Sharma',
    accountReference: 'ACC-10003',
    bankName: 'State Core Bank',
    nickname: 'Priya Personal',
    status: 'ACTIVE',
    createdAt: '2026-02-10T10:00:00Z',
  },
  {
    id: 2,
    userId: 3,
    beneficiaryName: 'Tech Supplies Corp',
    accountReference: 'ACC-10004',
    bankName: 'State Core Bank',
    nickname: 'Office Hardware',
    status: 'ACTIVE',
    createdAt: '2026-03-01T11:20:00Z',
  },
  {
    id: 3,
    userId: 3,
    beneficiaryName: 'Electricity Board',
    accountReference: 'ACC-10005',
    bankName: 'National Utility Bank',
    nickname: 'Home Electricity',
    status: 'ACTIVE',
    createdAt: '2026-03-15T09:15:00Z',
  },
]

export const initialMockApprovals: PendingApprovalView[] = [
  {
    id: 1,
    fromAccountId: 10001,
    toAccountId: 10004,
    toAccountName: 'Tech Supplies Corp',
    toAccountNumber: 'ACC-10004',
    amount: 45000,
    currency: 'INR',
    remarks: 'Bulk IT Hardware purchase (Invoice #994)',
    status: 'PENDING_APPROVAL',
    createdBy: 3,
    creatorUsername: 'customer.alex',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
]

export const initialMockLimits: SystemLimit[] = [
  { code: 'SINGLE_TRANSFER_LIMIT', value: 100000, description: 'Maximum amount for a single fund transfer' },
  { code: 'DAILY_TRANSFER_LIMIT', value: 500000, description: 'Maximum cumulative transfer volume allowed per customer per day' },
  { code: 'APPROVAL_THRESHOLD', value: 25000, description: 'Transfer threshold requiring maker-checker approval by bank staff' },
]

export const initialMockUsers: UserView[] = [
  { id: 1, username: 'admin', email: 'admin@demo.bank.local', fullName: 'Demo Administrator', status: 'ACTIVE', roles: ['ADMIN'], createdAt: '2026-01-01' },
  { id: 2, username: 'bank.user1', email: 'bank.user1@demo.bank.local', fullName: 'Priya Staff', status: 'ACTIVE', roles: ['BANK_USER'], createdAt: '2026-01-05' },
  { id: 3, username: 'customer.alex', email: 'customer.alex@demo.bank.local', fullName: 'Alex Demo', status: 'ACTIVE', roles: ['CUSTOMER'], createdAt: '2026-01-10' },
]

export const initialMockAuditLogs: AuditLogView[] = [
  { id: 1, actorUsername: 'customer.alex', action: 'TRANSFER_PENDING_APPROVAL', resourceType: 'TRANSFER', resourceId: '1', outcome: 'SUCCESS', details: '{"amount":45000,"currency":"INR"}', ipAddress: '127.0.0.1', createdAt: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: 2, actorUsername: 'customer.alex', action: 'TRANSFER_COMPLETED', resourceType: 'TRANSFER', resourceId: '99', outcome: 'SUCCESS', details: '{"amount":5000,"reference":"FIN-TXN-10091"}', ipAddress: '127.0.0.1', createdAt: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: 3, actorUsername: 'admin', action: 'USER_CREATED', resourceType: 'USER', resourceId: '2', outcome: 'SUCCESS', details: '{"username":"bank.user1","role":"BANK_USER"}', ipAddress: '127.0.0.1', createdAt: '2026-01-05T08:30:00Z' },
]

// Storage accessors
export const mockStore = {
  getAccounts: () => load<AccountSummaryView[]>('accounts', initialMockAccounts),
  setAccounts: (accs: AccountSummaryView[]) => save('accounts', accs),

  getTransactions: () => load<Record<number, TransactionView[]>>('transactions', initialMockTransactions),
  setTransactions: (txns: Record<number, TransactionView[]>) => save('transactions', txns),

  getBeneficiaries: () => load<BeneficiaryView[]>('beneficiaries', initialMockBeneficiaries),
  setBeneficiaries: (b: BeneficiaryView[]) => save('beneficiaries', b),

  getApprovals: () => load<PendingApprovalView[]>('approvals', initialMockApprovals),
  setApprovals: (a: PendingApprovalView[]) => save('approvals', a),

  getLimits: () => load<SystemLimit[]>('limits', initialMockLimits),
  setLimits: (l: SystemLimit[]) => save('limits', l),

  getUsers: () => load<UserView[]>('users', initialMockUsers),
  setUsers: (u: UserView[]) => save('users', u),

  getAuditLogs: () => load<AuditLogView[]>('audit_logs', initialMockAuditLogs),
  addAuditLog: (log: Omit<AuditLogView, 'id' | 'createdAt'>) => {
    const list = load<AuditLogView[]>('audit_logs', initialMockAuditLogs)
    const nextId = (list[0]?.id || 0) + 1
    const newEntry: AuditLogView = {
      ...log,
      id: nextId,
      createdAt: new Date().toISOString(),
    }
    save('audit_logs', [newEntry, ...list])
  },
}
