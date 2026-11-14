import { useState, type FormEvent } from 'react'
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Link, Paper, Stack, TextField, Typography,
} from '@mui/material'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import PersonIcon from '@mui/icons-material/Person'
import BadgeIcon from '@mui/icons-material/Badge'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import FlashOnIcon from '@mui/icons-material/FlashOn'
import { Navigate } from 'react-router-dom'
import { homePathFor, useAuth } from '../../contexts/AuthContext'
import { authApi, errorMessage } from '../../services/api'

export default function LoginPage() {
  const { user, status, login, sessionExpired } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)

  if (status === 'authenticated' && user) return <Navigate to={homePathFor(user)} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(username, password)
    } catch (err) {
      setError(errorMessage(err, 'Sign-in failed. Please check credentials.'))
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  const handleQuickLogin = async (u: string, p = 'DemoPass@2026') => {
    setUsername(u)
    setPassword(p)
    setBusy(true)
    setError('')
    try {
      await login(u, p)
    } catch (err) {
      setError(errorMessage(err, 'Quick login failed.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' } }}>
      <Box sx={{
        bgcolor: '#0b2046',
        color: '#fff',
        p: { xs: 4, md: 8 },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'linear-gradient(145deg, #07152f 0%, #0d3b66 100%)',
      }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <AccountBalanceIcon sx={{ fontSize: 36, color: '#00e676' }} />
          <Typography variant="h6" fontWeight={800} letterSpacing={-0.5}>OpenBank</Typography>
        </Stack>

        <Box sx={{ my: 4 }}>
          <Typography variant="h3" fontWeight={800} sx={{ lineHeight: 1.15, mb: 2 }}>
            Next-Gen Internet Banking.
          </Typography>
          <Typography sx={{ maxWidth: 460, opacity: 0.85, fontSize: 16, lineHeight: 1.6 }}>
            A complete 3-role banking portal built on <strong>Apache Fineract</strong> core banking engine,
            Spring Boot BFF, and React Material-UI. Experience dual-control maker-checker transfers, live
            ledger balances, onboarding, and audit governance.
          </Typography>
        </Box>

        <Box sx={{ pt: 2, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Three Persona Blueprints: Banking Customer · Bank Operations Staff · System Administrator
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', placeItems: 'center', p: { xs: 2.5, sm: 4 }, bgcolor: '#f8fafc' }}>
        <Paper elevation={0} sx={{ p: { xs: 3, sm: 4.5 }, width: '100%', maxWidth: 440, borderRadius: 3, border: '1px solid #e2e8f0' }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h5" fontWeight={800}>Sign in to Portal</Typography>
              <Typography variant="body2" color="text.secondary">Enter your banking credentials</Typography>
            </Box>

            {sessionExpired && <Alert severity="info">Your session ended. Please sign in again.</Alert>}
            {error && <Alert severity="error">{error}</Alert>}

            {/* Quick Demo Logins Box */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(0, 102, 204, 0.03)', borderColor: 'rgba(0, 102, 204, 0.2)', borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <FlashOnIcon sx={{ color: '#0066cc', fontSize: 18 }} />
                <Typography variant="caption" fontWeight={700} color="primary.main" textTransform="uppercase">
                  1-Click Demo Login
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  icon={<PersonIcon fontSize="small" />}
                  label="Customer (Alex)"
                  onClick={() => handleQuickLogin('customer.alex')}
                  clickable
                  variant="outlined"
                  color="primary"
                  sx={{ fontWeight: 600, fontSize: 12 }}
                />
                <Chip
                  icon={<BadgeIcon fontSize="small" />}
                  label="Bank Staff (Priya)"
                  onClick={() => handleQuickLogin('bank.user1')}
                  clickable
                  variant="outlined"
                  color="secondary"
                  sx={{ fontWeight: 600, fontSize: 12 }}
                />
                <Chip
                  icon={<AdminPanelSettingsIcon fontSize="small" />}
                  label="Admin"
                  onClick={() => handleQuickLogin('admin')}
                  clickable
                  variant="outlined"
                  sx={{ fontWeight: 600, fontSize: 12 }}
                />
              </Stack>
            </Paper>

            <Divider>
              <Typography variant="caption" color="text.secondary">or enter credentials</Typography>
            </Divider>

            <Box component="form" onSubmit={submit}>
              <Stack spacing={2}>
                <TextField
                  label="Username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  fullWidth
                  size="small"
                  required
                />
                <TextField
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  size="small"
                  required
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={busy || !username || !password}
                  sx={{ py: 1.2, fontWeight: 700, mt: 1 }}
                >
                  {busy ? 'Signing in…' : 'Sign in'}
                </Button>
              </Stack>
            </Box>

            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={() => setForgotOpen(true)}
              sx={{ alignSelf: 'center', color: 'text.secondary' }}
            >
              Forgot password?
            </Link>
          </Stack>
        </Paper>
      </Box>

      <ForgotDialog open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </Box>
  )
}

function ForgotDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [value, setValue] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const close = () => { setValue(''); setMessage(''); setError(''); onClose() }
  const submit = async () => {
    setError('')
    try {
      setMessage((await authApi.forgotPassword(value)).message)
    } catch (e) {
      setError(errorMessage(e))
    }
  }
  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>Password Recovery</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {message ? (
            <Alert severity="info">{message}</Alert>
          ) : (
            <TextField
              label="Username or Email"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. customer.alex"
              fullWidth
              size="small"
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={close}>Close</Button>
        {!message && <Button variant="contained" onClick={submit} disabled={!value}>Request Reset</Button>}
      </DialogActions>
    </Dialog>
  )
}
