import { Box, CircularProgress } from '@mui/material'
import { Navigate, Outlet } from 'react-router-dom'
import { homePathFor, useAuth } from '../contexts/AuthContext'
import type { RoleName } from '../types'

/** UX guard only. The server enforces the same rules on every API call. */
export default function ProtectedRoute({ role }: { role: RoleName }) {
  const { user, status } = useAuth()
  if (status === 'loading') {
    return <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>
  }
  if (!user) return <Navigate to="/login" replace />
  if (!user.roles.includes(role)) return <Navigate to={homePathFor(user)} replace />
  return <Outlet />
}
