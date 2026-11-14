export type RoleName = 'CUSTOMER' | 'BANK_USER' | 'ADMIN'
export const ROLE_LABELS: Record<RoleName, string> = {
  CUSTOMER: 'Banking Customer',
  BANK_USER: 'Bank User',
  ADMIN: 'Administrator',
}

export interface AuthUser {
  id: number
  username: string
  email: string
  fullName: string
  roles: RoleName[]
  permissions: string[]
}
export interface SessionInfo { user: AuthUser; idleTimeoutSeconds: number }

export interface PageResponse<T> { items: T[]; page: number; size: number; total: number }

export interface UserView {
  id: number
  username: string
  email: string
  fullName: string
  status: 'ACTIVE' | 'LOCKED' | 'DISABLED'
  roles: RoleName[]
  lockedUntil?: string
  lastLoginAt?: string
  createdAt: string
}

export interface RoleView { id: number; name: string; description?: string; permissions: string[] }
export interface PermissionView { code: string; description?: string }
export interface AuditLogView {
  id: number
  actorUserId?: number
  actorUsername?: string
  action: string
  resourceType?: string
  resourceId?: string
  outcome: string
  details: string
  ipAddress?: string
  createdAt: string
}
export interface Overview {
  usersByRole: Record<string, number>
  inactiveOrLockedUsers: number
  failedLogins24h: number
  accessDenied24h: number
}
export interface FineractStatus { engine: 'UP' | 'DOWN'; serviceCredentials: 'OK' | 'REJECTED' | 'UNKNOWN' }

// Phase 3: Customer Models
export interface CustomerProfileView {
  userId: number
  username: string
  fullName: string
  email: string
  phone: string
  fineractClientId: number
  kycStatus: string
  activeAccountsCount: number
}

export interface AccountSummaryView {
  id: number
  accountNumber: string
  clientId: number
  clientName: string
  productName: string
  status: string
  balance: number
  availableBalance: number
  currency: string
  interestRate: number
  openDate: string
  branchName: string
}

export interface TransactionView {
  id: number
  accountId: number
  transactionType: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT'
  amount: number
  currency: string
  runningBalance: number
  date: string
  remarks?: string
  reference?: string
}

export interface StatementView {
  accountId: number
  accountNumber: string
  currency: string
  openingBalance: number
  closingBalance: number
  totalTransactions: number
  transactions: TransactionView[]
}

// Phase 3: Beneficiaries & Transfers
export interface BeneficiaryView {
  id: number
  userId: number
  beneficiaryName: string
  accountReference: string
  bankName: string
  nickname: string
  status: string
  createdAt: string
}

export interface TransferRequestInput {
  fromAccountId: number
  toAccountId: number
  toAccountName?: string
  toAccountNumber?: string
  amount: number
  currency: string
  remarks?: string
}

export interface TransferResponse {
  id: number
  status: 'COMPLETED' | 'PENDING_APPROVAL' | 'REJECTED' | 'FAILED'
  reference: string
  amount: number
  currency: string
  fromAccountId: number
  toAccountId: number
  toAccountName: string
  toAccountNumber: string
  message: string
  createdAt: string
}

// Phase 4: Staff Operations Models
export interface CustomerStaffView {
  userId: number
  username: string
  fullName: string
  email: string
  phone: string
  fineractClientId: number
  status: string
  accountsCount: number
  createdAt: string
}

export interface PendingApprovalView {
  id: number
  fromAccountId: number
  toAccountId: number
  toAccountName: string
  toAccountNumber: string
  amount: number
  currency: string
  remarks: string
  status: string
  fineractTransferRef?: string
  createdBy: number
  creatorUsername: string
  createdAt: string
  updatedAt: string
}

// Phase 5: Limits & Reports
export interface SystemLimit {
  code: string
  value: number
  description: string
}

export interface TransactionReportSummary {
  totalTransfers: number
  totalVolumeCompleted: number
  totalVolumePending: number
  statusCounts: Record<string, number>
  recentTransactions: Array<{
    id: number
    from_account_id: number
    to_account_id: number
    to_account_name: string
    amount: number
    currency: string
    remarks: string
    status: string
    fineract_transfer_ref: string
    created_by_username: string
    created_at: string
  }>
}
