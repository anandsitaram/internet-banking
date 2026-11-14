import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardIcon from '@mui/icons-material/SpaceDashboard'
import GroupIcon from '@mui/icons-material/Group'
import AdminIcon from '@mui/icons-material/AdminPanelSettings'
import HistoryIcon from '@mui/icons-material/History'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import SendIcon from '@mui/icons-material/Send'
import ContactsIcon from '@mui/icons-material/Contacts'
import DescriptionIcon from '@mui/icons-material/Description'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import TuneIcon from '@mui/icons-material/Tune'
import AssessmentIcon from '@mui/icons-material/Assessment'

import { homePathFor, useAuth } from '../contexts/AuthContext'
import PortalLayout from '../layouts/PortalLayout'
import ProtectedRoute from '../routes/ProtectedRoute'
import LoginPage from '../features/auth/LoginPage'

// Customer Pages
import CustomerHome from '../features/customer/CustomerHome'
import CustomerAccountsPage from '../features/customer/CustomerAccountsPage'
import CustomerTransfersPage from '../features/customer/CustomerTransfersPage'
import CustomerBeneficiariesPage from '../features/customer/CustomerBeneficiariesPage'
import CustomerStatementsPage from '../features/customer/CustomerStatementsPage'

// Staff Pages
import StaffHome from '../features/staff/StaffHome'
import StaffCustomersPage from '../features/staff/StaffCustomersPage'
import StaffApprovalsPage from '../features/staff/StaffApprovalsPage'

// Admin Pages
import AdminOverview from '../features/admin/AdminOverview'
import UsersPage from '../features/admin/UsersPage'
import RolesPage from '../features/admin/RolesPage'
import AdminLimitsPage from '../features/admin/AdminLimitsPage'
import AuditLogsPage from '../features/admin/AuditLogsPage'
import AdminReportsPage from '../features/admin/AdminReportsPage'

const customerNav = [
  { label: 'Overview', to: '/customer', icon: <DashboardIcon />, end: true },
  { label: 'Accounts & Balances', to: '/customer/accounts', icon: <AccountBalanceWalletIcon /> },
  { label: 'Fund Transfers', to: '/customer/transfers', icon: <SendIcon /> },
  { label: 'Beneficiaries', to: '/customer/beneficiaries', icon: <ContactsIcon /> },
  { label: 'Statements', to: '/customer/statements', icon: <DescriptionIcon /> },
]

const staffNav = [
  { label: 'Operations Dashboard', to: '/staff', icon: <DashboardIcon />, end: true },
  { label: 'Customer Onboarding', to: '/staff/customers', icon: <HowToRegIcon /> },
  { label: 'Approvals Queue', to: '/staff/approvals', icon: <FactCheckIcon /> },
]

const adminNav = [
  { label: 'System Overview', to: '/admin', icon: <DashboardIcon />, end: true },
  { label: 'Users Management', to: '/admin/users', icon: <GroupIcon /> },
  { label: 'Roles & Permissions', to: '/admin/roles', icon: <AdminIcon /> },
  { label: 'Transaction Limits', to: '/admin/limits', icon: <TuneIcon /> },
  { label: 'Audit Trail', to: '/admin/audit', icon: <HistoryIcon /> },
  { label: 'Transaction Reports', to: '/admin/reports', icon: <AssessmentIcon /> },
]

function Home() {
  const { user, status } = useAuth()
  return status === 'loading' ? null : <Navigate to={homePathFor(user)} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Home />} />

      {/* Customer Routes */}
      <Route element={<ProtectedRoute role="CUSTOMER" />}>
        <Route path="/customer" element={<PortalLayout title="Online Banking Portal" nav={customerNav} />}>
          <Route index element={<CustomerHome />} />
          <Route path="accounts" element={<CustomerAccountsPage />} />
          <Route path="transfers" element={<CustomerTransfersPage />} />
          <Route path="beneficiaries" element={<CustomerBeneficiariesPage />} />
          <Route path="statements" element={<CustomerStatementsPage />} />
        </Route>
      </Route>

      {/* Bank User / Staff Routes */}
      <Route element={<ProtectedRoute role="BANK_USER" />}>
        <Route path="/staff" element={<PortalLayout title="Bank Operations Portal" nav={staffNav} />}>
          <Route index element={<StaffHome />} />
          <Route path="customers" element={<StaffCustomersPage />} />
          <Route path="approvals" element={<StaffApprovalsPage />} />
        </Route>
      </Route>

      {/* Admin Routes */}
      <Route element={<ProtectedRoute role="ADMIN" />}>
        <Route path="/admin" element={<PortalLayout title="Administration & Governance" nav={adminNav} />}>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="limits" element={<AdminLimitsPage />} />
          <Route path="audit" element={<AuditLogsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
