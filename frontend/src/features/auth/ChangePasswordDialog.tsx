import { useState } from 'react'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'
import { authApi, errorMessage } from '../../services/api'

export default function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const close = () => { setCurrent(''); setNext(''); setError(''); setDone(false); onClose() }
  const submit = async () => {
    setBusy(true); setError('')
    try { await authApi.changePassword(current, next); setDone(true) }
    catch (e) { setError(errorMessage(e)) }
    finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>Change password</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {done ? <Alert severity="success">Password updated.</Alert> : (<>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Current password" type="password" autoComplete="current-password" value={current}
              onChange={(e) => setCurrent(e.target.value)} />
            <TextField label="New password" type="password" autoComplete="new-password" value={next}
              onChange={(e) => setNext(e.target.value)}
              helperText="12+ characters with upper, lower, digit and symbol." />
          </>)}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{done ? 'Close' : 'Cancel'}</Button>
        {!done && <Button variant="contained" onClick={submit} disabled={busy || !current || !next}>Update</Button>}
      </DialogActions>
    </Dialog>
  )
}
