import { useState, type FormEvent } from 'react'
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, InputAdornment, Link, Paper, Stack, TextField, Typography,
} from '@mui/material'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { Navigate } from 'react-router-dom'
import { homePathFor, useAuth } from '../../contexts/AuthContext'
import { authApi, errorMessage } from '../../services/api'

export default function LoginPage() {
  const { user, status, login, sessionExpired } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      p: { xs: 2, sm: 3 },
      background: 'radial-gradient(circle at 15% 15%, #dbeafe 0, transparent 35%), linear-gradient(135deg, #f8fafc 0%, #eef4fb 100%)',
    }}>
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 440,
          p: { xs: 3, sm: 4.5 },
          border: '1px solid #e2e8f0',
          borderRadius: 4,
          boxShadow: '0 24px 70px rgba(15, 23, 42, 0.10)',
        }}
      >
        <Stack spacing={3}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{
              width: 44,
              height: 44,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 2,
              color: '#fff',
              bgcolor: '#0b2046',
            }}>
              <AccountBalanceIcon />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={800} color="#0b2046">OpenBank</Typography>
              <Typography variant="caption" color="text.secondary">SECURE BANKING PORTAL</Typography>
            </Box>
          </Stack>

          <Box>
            <Typography variant="h4" fontWeight={800} letterSpacing={-0.8} color="#10233f">
              Welcome back
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              Sign in to continue to your account.
            </Typography>
          </Box>

          {sessionExpired && <Alert severity="info">Your sign-in expired. Please sign in again.</Alert>}
          {error && <Alert severity="error">{error}</Alert>}

          <Box component="form" onSubmit={submit}>
            <Stack spacing={2}>
              <TextField
                label="Username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((visible) => !visible)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={busy || !username || !password}
                sx={{
                  minHeight: 48,
                  mt: 0.5,
                  borderRadius: 2,
                  bgcolor: '#0b2046',
                  fontWeight: 700,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#123765' },
                }}
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
            sx={{ alignSelf: 'center', color: '#315b89', fontWeight: 600, textDecoration: 'none' }}
          >
            Forgot password?
          </Link>
        </Stack>
      </Paper>
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
