import { mockStore } from './mockData'
import type {
  AccountSummaryView, BeneficiaryView, CustomerProfileView, CustomerStaffView,
  FineractStatus, PendingApprovalView, SessionInfo, StatementView,
  SystemLimit, TransactionReportSummary, TransactionView, TransferRequestInput, TransferResponse, UserView,
} from '../types'

// Delay helper to simulate network call
const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms))

export const mockApi = {
  // 5.1 Auth
  auth: {
    login: async (username: string): Promise<SessionInfo> => {
      await delay()
      const u = username.toLowerCase().trim()
      let role: 'CUSTOMER' | 'BANK_USER' | 'ADMIN' = 'CUSTOMER'
      let fullName = 'Alex Demo'
      let id = 3

      if (u.includes('admin')) {
        role = 'ADMIN'
        fullName = 'Demo Administrator'
        id = 1
      } else if (u.includes('bank') || u.includes('staff')) {
        role = 'BANK_USER'
        fullName = 'Priya Staff'
        id = 2
      }

      mockStore.addAuditLog({
        actorUsername: username,
        action: 'LOGIN_SUCCESS',
        resourceType: 'SESSION',
        outcome: 'SUCCESS',
        details: JSON.stringify({ role, simulated: true }),
        ipAddress: '127.0.0.1 (Demo Mode)',
      })

      return {
        user: {
          id,
          username,
          fullName,
          email: `${u}@demo.bank.local`,
          roles: [role],
          permissions: role === 'ADMIN'
            ? ['USER_READ', 'USER_WRITE', 'ROLES_READ', 'ROLES_WRITE', 'AUDIT_READ', 'REPORT_READ', 'FINERACT_STATUS', 'LIMITS_READ', 'LIMITS_WRITE']
            : role === 'BANK_USER'
            ? ['CUSTOMER_REGISTER', 'CUSTOMER_READ', 'ACCOUNT_OPEN', 'APPROVAL_DECIDE']
            : ['ACCOUNT_VIEW_OWN', 'TRANSFER_CREATE', 'BENEFICIARY_MANAGE', 'STATEMENT_DOWNLOAD'],
        },
        accessToken: '',
        expiresInSeconds: 900,
      }
    },
    me: async (currentUser: any): Promise<SessionInfo> => {
      await delay(50)
      return { user: currentUser, accessToken: '', expiresInSeconds: 900 }
    },
  },

  // 5.2 Customer
  customer: {
    profile: async (): Promise<CustomerProfileView> => {
      await delay()
      const accounts = mockStore.getAccounts()
      return {
        userId: 3,
        username: 'customer.alex',
        fullName: 'Alex Demo',
        email: 'customer.alex@demo.bank.local',
        phone: '+91 98765 43210',
        fineractClientId: 1,
        kycStatus: 'VERIFIED',
        activeAccountsCount: accounts.length,
      }
    },
    accounts: async (): Promise<AccountSummaryView[]> => {
      await delay()
      return mockStore.getAccounts()
    },
    account: async (id: number): Promise<AccountSummaryView> => {
      await delay()
      const acc = mockStore.getAccounts().find((a) => a.id === id)
      if (!acc) throw new Error('Account not found')
      return acc
    },
    balance: async (id: number) => {
      await delay()
      const acc = mockStore.getAccounts().find((a) => a.id === id)
      if (!acc) throw new Error('Account not found')
      return { accountId: acc.id, accountNumber: acc.accountNumber, balance: acc.balance, availableBalance: acc.availableBalance, currency: acc.currency }
    },
    transactions: async (id: number): Promise<TransactionView[]> => {
      await delay()
      const txns = mockStore.getTransactions()
      return txns[id] || []
    },
    statement: async (id: number, fromDate?: string, toDate?: string): Promise<StatementView> => {
      await delay()
      const acc = mockStore.getAccounts().find((a) => a.id === id)
      const allTxns = mockStore.getTransactions()[id] || []
      const filtered = allTxns.filter((t) => (!fromDate || t.date >= fromDate) && (!toDate || t.date <= toDate))
      return {
        accountId: id,
        accountNumber: acc?.accountNumber || `ACC-${id}`,
        currency: acc?.currency || 'INR',
        openingBalance: filtered.length ? filtered[filtered.length - 1].runningBalance : (acc?.balance || 0),
        closingBalance: filtered.length ? filtered[0].runningBalance : (acc?.balance || 0),
        totalTransactions: filtered.length,
        transactions: filtered,
      }
    },
  },

  // 5.3 Transfers & Beneficiaries
  transfers: {
    list: async (): Promise<TransferResponse[]> => {
      await delay()
      const approvals = mockStore.getApprovals()
      return approvals.map((a) => ({
        id: a.id,
        status: a.status as any,
        reference: a.fineractTransferRef || `REQ-${a.id}`,
        amount: a.amount,
        currency: a.currency,
        fromAccountId: a.fromAccountId,
        toAccountId: a.toAccountId,
        toAccountName: a.toAccountName,
        toAccountNumber: a.toAccountNumber,
        message: a.status === 'PENDING_APPROVAL' ? 'Pending bank staff approval' : 'Completed',
        createdAt: a.createdAt,
      }))
    },
    initiate: async (input: TransferRequestInput): Promise<TransferResponse> => {
      await delay(300)
      const accounts = mockStore.getAccounts()
      const sourceAcc = accounts.find((a) => a.id === input.fromAccountId)
      if (!sourceAcc) throw new Error('Source account not found')
      if (sourceAcc.availableBalance < input.amount) throw new Error('Insufficient funds')

      const limits = mockStore.getLimits()
      const approvalLimit = limits.find((l) => l.code === 'APPROVAL_THRESHOLD')?.value || 25000

      // Case 1: Exceeds threshold -> PENDING_APPROVAL
      if (input.amount > approvalLimit) {
        const nextId = Date.now()
        const pending = {
          id: nextId,
          fromAccountId: input.fromAccountId,
          toAccountId: input.toAccountId,
          toAccountName: input.toAccountName || `Beneficiary (${input.toAccountId})`,
          toAccountNumber: input.toAccountNumber || String(input.toAccountId),
          amount: input.amount,
          currency: input.currency || 'INR',
          remarks: input.remarks || 'Transfer via Internet Banking',
          status: 'PENDING_APPROVAL',
          createdBy: 3,
          creatorUsername: 'customer.alex',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        mockStore.setApprovals([pending, ...mockStore.getApprovals()])
        mockStore.addAuditLog({
          actorUsername: 'customer.alex',
          action: 'TRANSFER_PENDING_APPROVAL',
          resourceType: 'TRANSFER',
          resourceId: String(nextId),
          outcome: 'SUCCESS',
          details: JSON.stringify({ amount: input.amount, threshold: approvalLimit }),
          ipAddress: '127.0.0.1 (Demo Mode)',
        })

        return {
          id: nextId,
          status: 'PENDING_APPROVAL',
          reference: `PENDING-${nextId}`,
          amount: input.amount,
          currency: input.currency,
          fromAccountId: input.fromAccountId,
          toAccountId: input.toAccountId,
          toAccountName: pending.toAccountName,
          toAccountNumber: pending.toAccountNumber,
          message: `Transfer exceeds ₹${approvalLimit.toLocaleString()} and has been routed to Bank User for maker-checker approval.`,
          createdAt: pending.createdAt,
        }
      }

      // Case 2: Instant execution
      const newBal = sourceAcc.balance - input.amount
      sourceAcc.balance = newBal
      sourceAcc.availableBalance = newBal
      mockStore.setAccounts([...accounts])

      const ref = `FIN-TXN-${Math.floor(10000 + Math.random() * 90000)}`
      const allTxns = mockStore.getTransactions()
      const currentList = allTxns[input.fromAccountId] || []
      const newTxn: TransactionView = {
        id: Date.now(),
        accountId: input.fromAccountId,
        transactionType: 'TRANSFER_OUT',
        amount: input.amount,
        currency: input.currency || 'INR',
        runningBalance: newBal,
        date: new Date().toISOString().slice(0, 10),
        remarks: input.remarks || `Transfer to ${input.toAccountName || input.toAccountId}`,
        reference: ref,
      }
      allTxns[input.fromAccountId] = [newTxn, ...currentList]
      mockStore.setTransactions(allTxns)

      mockStore.addAuditLog({
        actorUsername: 'customer.alex',
        action: 'TRANSFER_COMPLETED',
        resourceType: 'TRANSFER',
        resourceId: ref,
        outcome: 'SUCCESS',
        details: JSON.stringify({ amount: input.amount, reference: ref }),
        ipAddress: '127.0.0.1 (Demo Mode)',
      })

      return {
        id: Date.now(),
        status: 'COMPLETED',
        reference: ref,
        amount: input.amount,
        currency: input.currency,
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        toAccountName: input.toAccountName || String(input.toAccountId),
        toAccountNumber: input.toAccountNumber || String(input.toAccountId),
        message: 'Transfer completed successfully.',
        createdAt: new Date().toISOString(),
      }
    },
  },

  beneficiaries: {
    list: async (): Promise<BeneficiaryView[]> => {
      await delay()
      return mockStore.getBeneficiaries().filter((b) => b.status === 'ACTIVE')
    },
    add: async (b: { beneficiaryName: string; accountReference: string; bankName?: string; nickname?: string }) => {
      await delay()
      const list = mockStore.getBeneficiaries()
      const newB: BeneficiaryView = {
        id: Date.now(),
        userId: 3,
        beneficiaryName: b.beneficiaryName,
        accountReference: b.accountReference,
        bankName: b.bankName || 'State Core Bank',
        nickname: b.nickname || b.beneficiaryName,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      }
      mockStore.setBeneficiaries([newB, ...list])
      return newB
    },
    remove: async (id: number) => {
      await delay()
      const list = mockStore.getBeneficiaries().map((b) => (b.id === id ? { ...b, status: 'REMOVED' } : b))
      mockStore.setBeneficiaries(list)
    },
  },

  // 5.4 Staff Operations
  staff: {
    customers: async (q = ''): Promise<CustomerStaffView[]> => {
      await delay()
      const users = mockStore.getUsers().filter((u) => u.roles.includes('CUSTOMER'))
      return users
        .filter((u) => !q || u.fullName.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()))
        .map((u) => ({
          userId: u.id,
          username: u.username,
          fullName: u.fullName,
          email: u.email,
          phone: '+91 98765 43210',
          fineractClientId: u.id,
          status: u.status,
          accountsCount: 2,
          createdAt: u.createdAt,
        }))
    },
    registerCustomer: async (input: { username: string; email: string; fullName: string; phone: string; initialDeposit: number }) => {
      await delay(300)
      const users = mockStore.getUsers()
      const nextId = users.length + 1
      const newUser: UserView = {
        id: nextId,
        username: input.username,
        email: input.email,
        fullName: input.fullName,
        status: 'ACTIVE',
        roles: ['CUSTOMER'],
        createdAt: new Date().toISOString().slice(0, 10),
      }
      mockStore.setUsers([...users, newUser])

      if (input.initialDeposit > 0) {
        const accounts = mockStore.getAccounts()
        const newAcc: AccountSummaryView = {
          id: 20000 + nextId,
          accountNumber: `SAV-${20000 + nextId}`,
          clientId: nextId,
          clientName: input.fullName,
          productName: 'Standard Demo Savings',
          status: 'ACTIVE',
          balance: input.initialDeposit,
          availableBalance: input.initialDeposit,
          currency: 'INR',
          interestRate: 3.5,
          openDate: new Date().toISOString().slice(0, 10),
          branchName: 'Mumbai Main Branch',
        }
        mockStore.setAccounts([...accounts, newAcc])
      }

      mockStore.addAuditLog({
        actorUsername: 'bank.user1',
        action: 'CUSTOMER_REGISTERED',
        resourceType: 'CUSTOMER',
        resourceId: String(nextId),
        outcome: 'SUCCESS',
        details: JSON.stringify({ username: input.username, deposit: input.initialDeposit }),
        ipAddress: '127.0.0.1 (Demo Mode)',
      })

      return {
        userId: nextId,
        username: input.username,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        fineractClientId: nextId,
        status: 'ACTIVE',
        accountsCount: 1,
        createdAt: new Date().toISOString(),
      }
    },
    openAccount: async (input: { customerUserId: number; productName?: string; initialDeposit: number }) => {
      await delay(250)
      const accounts = mockStore.getAccounts()
      const user = mockStore.getUsers().find((u) => u.id === input.customerUserId)
      const nextAccId = 20000 + accounts.length + 1
      const newAcc: AccountSummaryView = {
        id: nextAccId,
        accountNumber: `SAV-${nextAccId}`,
        clientId: input.customerUserId,
        clientName: user?.fullName || 'Customer',
        productName: input.productName || 'Premium Demo Savings',
        status: 'ACTIVE',
        balance: input.initialDeposit || 0,
        availableBalance: input.initialDeposit || 0,
        currency: 'INR',
        interestRate: 4.0,
        openDate: new Date().toISOString().slice(0, 10),
        branchName: 'Mumbai Main Branch',
      }
      mockStore.setAccounts([...accounts, newAcc])
      return newAcc
    },
    approvals: async (): Promise<PendingApprovalView[]> => {
      await delay()
      return mockStore.getApprovals().filter((a) => a.status === 'PENDING_APPROVAL')
    },
    approveTransfer: async (id: number, comment = 'Approved') => {
      await delay(250)
      const approvals = mockStore.getApprovals()
      const item = approvals.find((a) => a.id === id)
      if (!item) throw new Error('Request not found')

      // Maker-checker validation: Priya cannot approve her own request
      // (Alex initiated it, so Priya can approve!)
      item.status = 'COMPLETED'
      item.fineractTransferRef = `FIN-TXN-${Math.floor(10000 + Math.random() * 90000)}`
      item.updatedAt = new Date().toISOString()
      mockStore.setApprovals([...approvals])

      // Deduct from sender account
      const accounts = mockStore.getAccounts()
      const acc = accounts.find((a) => a.id === item.fromAccountId)
      if (acc) {
        acc.balance -= item.amount
        acc.availableBalance -= item.amount
        mockStore.setAccounts([...accounts])

        // Add transaction
        const allTxns = mockStore.getTransactions()
        const list = allTxns[item.fromAccountId] || []
        allTxns[item.fromAccountId] = [
          {
            id: Date.now(),
            accountId: item.fromAccountId,
            transactionType: 'TRANSFER_OUT',
            amount: item.amount,
            currency: item.currency,
            runningBalance: acc.balance,
            date: new Date().toISOString().slice(0, 10),
            remarks: `${item.remarks} [Approved by Priya Staff]`,
            reference: item.fineractTransferRef,
          },
          ...list,
        ]
        mockStore.setTransactions(allTxns)
      }

      mockStore.addAuditLog({
        actorUsername: 'bank.user1',
        action: 'TRANSFER_APPROVED',
        resourceType: 'TRANSFER',
        resourceId: String(id),
        outcome: 'SUCCESS',
        details: JSON.stringify({ reference: item.fineractTransferRef, comment }),
        ipAddress: '127.0.0.1 (Demo Mode)',
      })

      return { status: 'COMPLETED', reference: item.fineractTransferRef, message: 'Transfer approved and executed.' }
    },
    rejectTransfer: async (id: number, comment = 'Rejected by staff') => {
      await delay(200)
      const approvals = mockStore.getApprovals()
      const item = approvals.find((a) => a.id === id)
      if (!item) throw new Error('Request not found')
      item.status = 'REJECTED'
      item.updatedAt = new Date().toISOString()
      mockStore.setApprovals([...approvals])

      mockStore.addAuditLog({
        actorUsername: 'bank.user1',
        action: 'TRANSFER_REJECTED',
        resourceType: 'TRANSFER',
        resourceId: String(id),
        outcome: 'SUCCESS',
        details: JSON.stringify({ comment }),
        ipAddress: '127.0.0.1 (Demo Mode)',
      })

      return { status: 'REJECTED', message: 'Transfer rejected.' }
    },
  },

  // 5.5 Admin
  admin: {
    limits: async (): Promise<SystemLimit[]> => {
      await delay()
      return mockStore.getLimits()
    },
    updateLimit: async (code: string, value: number): Promise<SystemLimit[]> => {
      await delay()
      const list = mockStore.getLimits().map((l) => (l.code === code ? { ...l, value } : l))
      mockStore.setLimits(list)
      mockStore.addAuditLog({
        actorUsername: 'admin',
        action: 'LIMIT_UPDATED',
        resourceType: 'SYSTEM_LIMIT',
        resourceId: code,
        outcome: 'SUCCESS',
        details: JSON.stringify({ code, value }),
        ipAddress: '127.0.0.1 (Demo Mode)',
      })
      return list
    },
    reports: async (): Promise<TransactionReportSummary> => {
      await delay()
      const approvals = mockStore.getApprovals()
      const totalTransfers = approvals.length + 3
      const completed = approvals.filter((a) => a.status === 'COMPLETED').reduce((acc, a) => acc + a.amount, 5000)
      const pending = approvals.filter((a) => a.status === 'PENDING_APPROVAL').reduce((acc, a) => acc + a.amount, 0)
      return {
        totalTransfers,
        totalVolumeCompleted: completed,
        totalVolumePending: pending,
        statusCounts: {
          COMPLETED: 3,
          PENDING_APPROVAL: approvals.filter((a) => a.status === 'PENDING_APPROVAL').length,
          REJECTED: approvals.filter((a) => a.status === 'REJECTED').length,
        },
        recentTransactions: approvals.map((a) => ({
          id: a.id,
          from_account_id: a.fromAccountId,
          to_account_id: a.toAccountId,
          to_account_name: a.toAccountName,
          amount: a.amount,
          currency: a.currency,
          remarks: a.remarks,
          status: a.status,
          fineract_transfer_ref: a.fineractTransferRef || `REQ-${a.id}`,
          created_by_username: a.creatorUsername,
          created_at: a.createdAt,
        })),
      }
    },
    fineractStatus: async (): Promise<FineractStatus> => {
      await delay(50)
      return { engine: 'UP', serviceCredentials: 'OK' }
    },
  },
}
