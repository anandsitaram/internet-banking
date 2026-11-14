import axios from 'axios'
import { mockApi } from './mockApi'
import { mockStore } from './mockData'
import type {
  AccountSummaryView, AuditLogView, BeneficiaryView, CustomerProfileView, CustomerStaffView,
  FineractStatus, Overview, PageResponse, PendingApprovalView, PermissionView, RoleView, SessionInfo,
  StatementView, SystemLimit, TransactionReportSummary, TransactionView, TransferRequestInput, TransferResponse, UserView,
} from '../types'

/** Check if running on Vercel preview or demo mode requested */
export const isDemoMode = (): boolean => {
  if (typeof window === 'undefined') return false
  const explicit = localStorage.getItem('ib_demo_mode')
  if (explicit !== null) return explicit === 'true'
  // Auto-activate demo mode on Vercel or when no local backend proxy is available
  return window.location.hostname.includes('vercel.app') || window.location.hostname.includes('github.io')
}

export const setDemoMode = (enabled: boolean): void => {
  localStorage.setItem('ib_demo_mode', String(enabled))
  window.location.reload()
}

/** Same-origin API client. Auth is an HttpOnly session cookie; CSRF token is echoed from the XSRF-TOKEN cookie. */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  withXSRFToken: true,
  timeout: 15000,
})

export const UNAUTHORIZED_EVENT = 'ib:unauthorized'

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url: string = err?.config?.url ?? ''
    if (axios.isAxiosError(err) && err.response?.status === 401 && !/\/auth\/(login|me)$/.test(url)) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    return Promise.reject(err)
  },
)

export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; fields?: Record<string, string> } | undefined
    if (data?.fields) return Object.entries(data.fields).map(([k, v]) => `${k}: ${v}`).join(' · ')
    if (data?.message) return data.message
    if (!err.response) return 'Cannot reach the server.'
  }
  if (err instanceof Error) return err.message
  return fallback
}

// 5.1 Auth APIs
export const authApi = {
  me: (): Promise<SessionInfo> => {
    if (isDemoMode()) {
      const savedUser = localStorage.getItem('ib_demo_user')
      if (savedUser) {
        try {
          return mockApi.auth.me(JSON.parse(savedUser))
        } catch {
          // fallback
        }
      }
      return Promise.reject(new Error('No demo session'))
    }
    return api.get<SessionInfo>('/auth/me').then((r) => r.data)
  },
  login: async (username: string, password?: string): Promise<SessionInfo> => {
    if (isDemoMode()) {
      const res = await mockApi.auth.login(username)
      localStorage.setItem('ib_demo_user', JSON.stringify(res.user))
      return res
    }
    return api.post<SessionInfo>('/auth/login', { username, password }).then((r) => r.data)
  },
  logout: async () => {
    if (isDemoMode()) {
      localStorage.removeItem('ib_demo_user')
      return Promise.resolve()
    }
    return api.post('/auth/logout')
  },
  refresh: (): Promise<SessionInfo> => {
    if (isDemoMode()) return authApi.me()
    return api.post<SessionInfo>('/auth/refresh').then((r) => r.data)
  },
  forgotPassword: (usernameOrEmail: string) => {
    if (isDemoMode()) return Promise.resolve({ message: 'Password recovery email sent (Demo simulation).' })
    return api.post<{ message: string }>('/auth/forgot-password', { usernameOrEmail }).then((r) => r.data)
  },
  changePassword: (currentPassword: string, newPassword: string) => {
    if (isDemoMode()) return Promise.resolve()
    return api.post('/auth/change-password', { currentPassword, newPassword })
  },
}

export interface UserForm {
  username?: string; email: string; fullName: string; role: string; password?: string
  status?: string; newPassword?: string
}

// 5.2 Customer APIs
export const customerApi = {
  profile: (): Promise<CustomerProfileView> => {
    if (isDemoMode()) return mockApi.customer.profile()
    return api.get<CustomerProfileView>('/customer/profile').then((r) => r.data)
  },
  accounts: (): Promise<AccountSummaryView[]> => {
    if (isDemoMode()) return mockApi.customer.accounts()
    return api.get<AccountSummaryView[]>('/customer/accounts').then((r) => r.data)
  },
  account: (id: number): Promise<AccountSummaryView> => {
    if (isDemoMode()) return mockApi.customer.account(id)
    return api.get<AccountSummaryView>(`/customer/accounts/${id}`).then((r) => r.data)
  },
  balance: (id: number) => {
    if (isDemoMode()) return mockApi.customer.balance(id)
    return api.get<{ accountId: number; accountNumber: string; balance: number; availableBalance: number; currency: string }>(`/customer/accounts/${id}/balance`).then((r) => r.data)
  },
  transactions: (id: number): Promise<TransactionView[]> => {
    if (isDemoMode()) return mockApi.customer.transactions(id)
    return api.get<TransactionView[]>(`/customer/accounts/${id}/transactions`).then((r) => r.data)
  },
  statement: (id: number, fromDate?: string, toDate?: string): Promise<StatementView> => {
    if (isDemoMode()) return mockApi.customer.statement(id, fromDate, toDate)
    return api.get<StatementView>(`/customer/accounts/${id}/statement`, { params: { fromDate, toDate } }).then((r) => r.data)
  },
}

// 5.3 Transfers & Beneficiaries APIs
export const transfersApi = {
  list: (): Promise<TransferResponse[]> => {
    if (isDemoMode()) return mockApi.transfers.list()
    return api.get<TransferResponse[]>('/transfers').then((r) => r.data)
  },
  get: (id: number): Promise<TransferResponse> => {
    return api.get<TransferResponse>(`/transfers/${id}`).then((r) => r.data)
  },
  initiate: (input: TransferRequestInput, idempotencyKey?: string): Promise<TransferResponse> => {
    if (isDemoMode()) return mockApi.transfers.initiate(input)
    return api.post<TransferResponse>('/transfers', input, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    }).then((r) => r.data)
  },
}

export const beneficiariesApi = {
  list: (): Promise<BeneficiaryView[]> => {
    if (isDemoMode()) return mockApi.beneficiaries.list()
    return api.get<BeneficiaryView[]>('/beneficiaries').then((r) => r.data)
  },
  add: (b: { beneficiaryName: string; accountReference: string; bankName?: string; nickname?: string }): Promise<BeneficiaryView> => {
    if (isDemoMode()) return mockApi.beneficiaries.add(b)
    return api.post<BeneficiaryView>('/beneficiaries', b).then((r) => r.data)
  },
  remove: (id: number): Promise<void> => {
    if (isDemoMode()) return mockApi.beneficiaries.remove(id)
    return api.delete(`/beneficiaries/${id}`).then(() => undefined)
  },
}

// 5.4 Staff Operations APIs
export const staffApi = {
  customers: (q = ''): Promise<CustomerStaffView[]> => {
    if (isDemoMode()) return mockApi.staff.customers(q)
    return api.get<CustomerStaffView[]>('/staff/customers', { params: { q: q || undefined } }).then((r) => r.data)
  },
  customerDetails: (id: number) => {
    return api.get(`/staff/customers/${id}`).then((r) => r.data)
  },
  registerCustomer: (input: { username: string; email: string; fullName: string; phone: string; initialDeposit: number; currency?: string; password?: string }) => {
    if (isDemoMode()) return mockApi.staff.registerCustomer(input)
    return api.post('/staff/customers', input).then((r) => r.data)
  },
  openAccount: (input: { customerUserId: number; productName?: string; initialDeposit: number; currency?: string }) => {
    if (isDemoMode()) return mockApi.staff.openAccount(input)
    return api.post('/staff/accounts', input).then((r) => r.data)
  },
  approvals: (): Promise<PendingApprovalView[]> => {
    if (isDemoMode()) return mockApi.staff.approvals()
    return api.get<PendingApprovalView[]>('/staff/approvals').then((r) => r.data)
  },
  approve: (id: number, comment?: string) => {
    if (isDemoMode()) return mockApi.staff.approveTransfer(id, comment)
    return api.post(`/staff/approvals/${id}/approve`, { comment }).then((r) => r.data)
  },
  reject: (id: number, comment?: string) => {
    if (isDemoMode()) return mockApi.staff.rejectTransfer(id, comment)
    return api.post(`/staff/approvals/${id}/reject`, { comment }).then((r) => r.data)
  },
}

// 5.5 Admin APIs
export const adminApi = {
  overview: (): Promise<Overview> => {
    if (isDemoMode()) {
      return Promise.resolve({
        usersByRole: { ADMIN: 1, BANK_USER: 1, CUSTOMER: mockStore.getUsers().filter((u) => u.roles.includes('CUSTOMER')).length },
        inactiveOrLockedUsers: 0,
        failedLogins24h: 0,
        accessDenied24h: 0,
      })
    }
    return api.get<Overview>('/admin/overview').then((r) => r.data)
  },
  fineractStatus: (): Promise<FineractStatus> => {
    if (isDemoMode()) return mockApi.admin.fineractStatus()
    return api.get<FineractStatus>('/fineract/status', { validateStatus: (s) => s === 200 || s === 503 }).then((r) => r.data)
  },
  users: (q: string, page: number, size: number): Promise<PageResponse<UserView>> => {
    if (isDemoMode()) {
      const all = mockStore.getUsers().filter((u) => !q || u.username.includes(q) || u.fullName.includes(q))
      return Promise.resolve({ items: all, page, size, total: all.length })
    }
    return api.get<PageResponse<UserView>>('/admin/users', { params: { q: q || undefined, page, size } }).then((r) => r.data)
  },
  createUser: (f: UserForm): Promise<UserView> => {
    if (isDemoMode()) {
      const users = mockStore.getUsers()
      const newU: UserView = {
        id: users.length + 1,
        username: f.username || f.email.split('@')[0],
        email: f.email,
        fullName: f.fullName,
        status: 'ACTIVE',
        roles: [f.role as any],
        createdAt: new Date().toISOString(),
      }
      mockStore.setUsers([...users, newU])
      return Promise.resolve(newU)
    }
    return api.post<UserView>('/admin/users', f).then((r) => r.data)
  },
  updateUser: (id: number, f: UserForm): Promise<UserView> => {
    if (isDemoMode()) {
      const users = mockStore.getUsers().map((u) => (u.id === id ? { ...u, fullName: f.fullName, email: f.email, roles: [f.role as any] } : u))
      mockStore.setUsers(users)
      return Promise.resolve(users.find((u) => u.id === id)!)
    }
    return api.put<UserView>(`/admin/users/${id}`, f).then((r) => r.data)
  },
  roles: (): Promise<RoleView[]> => {
    return api.get<RoleView[]>('/admin/roles').catch(() => [
      { id: 1, name: 'ADMIN', description: 'Administrator', permissions: ['USER_READ', 'USER_WRITE', 'ROLES_READ', 'ROLES_WRITE', 'AUDIT_READ', 'REPORT_READ', 'FINERACT_STATUS', 'LIMITS_READ', 'LIMITS_WRITE'] },
      { id: 2, name: 'BANK_USER', description: 'Bank staff', permissions: ['CUSTOMER_REGISTER', 'CUSTOMER_READ', 'ACCOUNT_OPEN', 'APPROVAL_DECIDE'] },
      { id: 3, name: 'CUSTOMER', description: 'Banking customer', permissions: ['ACCOUNT_VIEW_OWN', 'TRANSFER_CREATE', 'BENEFICIARY_MANAGE', 'STATEMENT_DOWNLOAD'] },
    ]).then((r) => Array.isArray(r) ? r : (r as any).data)
  },
  permissions: (): Promise<PermissionView[]> => {
    return api.get<PermissionView[]>('/admin/permissions').catch(() => [
      { code: 'USER_READ', description: 'View portal users' },
      { code: 'USER_WRITE', description: 'Create and update portal users' },
      { code: 'ROLES_READ', description: 'View roles and permissions' },
      { code: 'ROLES_WRITE', description: 'Change role permissions' },
      { code: 'AUDIT_READ', description: 'View audit logs' },
      { code: 'REPORT_READ', description: 'View transaction reports' },
      { code: 'FINERACT_STATUS', description: 'View banking engine status' },
      { code: 'LIMITS_READ', description: 'View transaction limits' },
      { code: 'LIMITS_WRITE', description: 'Configure transaction limits' },
    ]).then((r) => Array.isArray(r) ? r : (r as any).data)
  },
  setPermissions: (roleId: number, permissions: string[]): Promise<RoleView> => {
    return api.put<RoleView>(`/admin/roles/${roleId}/permissions`, { permissions }).then((r) => r.data)
  },
  auditLogs: (p: { action?: string; outcome?: string; actor?: string; page: number; size: number }): Promise<PageResponse<AuditLogView>> => {
    if (isDemoMode()) {
      const logs = mockStore.getAuditLogs().filter((l) => {
        if (p.action && !l.action.includes(p.action)) return false
        if (p.outcome && l.outcome !== p.outcome) return false
        if (p.actor && !l.actorUsername?.includes(p.actor)) return false
        return true
      })
      return Promise.resolve({ items: logs, page: p.page, size: p.size, total: logs.length })
    }
    return api.get<PageResponse<AuditLogView>>('/admin/audit-logs', {
      params: { ...p, action: p.action || undefined, outcome: p.outcome || undefined, actor: p.actor || undefined },
    }).then((r) => r.data)
  },
  limits: (): Promise<SystemLimit[]> => {
    if (isDemoMode()) return mockApi.admin.limits()
    return api.get<SystemLimit[]>('/admin/limits').then((r) => r.data)
  },
  updateLimit: (code: string, value: number): Promise<SystemLimit[]> => {
    if (isDemoMode()) return mockApi.admin.updateLimit(code, value)
    return api.put<SystemLimit[]>('/admin/limits', { code, value }).then((r) => r.data)
  },
  reports: (): Promise<TransactionReportSummary> => {
    if (isDemoMode()) return mockApi.admin.reports()
    return api.get<TransactionReportSummary>('/admin/reports/transactions').then((r) => r.data)
  },
}
