import { useCallback, useEffect, useState } from 'react'
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography,
} from '@mui/material'
import { adminApi, errorMessage, type UserForm } from '../../services/api'
import { ROLE_LABELS, type RoleName, type UserView } from '../../types'
import { formatDateTime } from '../../utils/format'

const ROLES = Object.keys(ROLE_LABELS) as RoleName[]
const STATUSES = ['ACTIVE', 'LOCKED', 'DISABLED']
type Editing = { mode: 'create' } | { mode: 'edit'; user: UserView }

export default function UsersPage() {
  const [rows, setRows] = useState<UserView[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Editing | null>(null)

  const load = useCallback(() => {
    adminApi.users(q, page, size)
      .then((r) => { setRows(r.items); setTotal(r.total); setError('') })
      .catch((e) => setError(errorMessage(e)))
  }, [q, page, size])
  useEffect(() => { load() }, [load])

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h4">Users</Typography>
        <Button variant="contained" onClick={() => setEditing({ mode: 'create' })}>Create user</Button>
      </Stack>
      <TextField size="small" label="Search name, username or email" value={q}
        onChange={(e) => { setQ(e.target.value); setPage(0) }} sx={{ maxWidth: 360 }} />
      {error && <Alert severity="error">{error}</Alert>}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell><TableCell>Username</TableCell><TableCell>Role</TableCell>
                <TableCell>Status</TableCell><TableCell>Last sign-in</TableCell><TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>{u.fullName}<Box component="div" sx={{ color: 'text.secondary', fontSize: 12 }}>{u.email}</Box></TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>{u.roles.map((r) => ROLE_LABELS[r] ?? r).join(', ')}</TableCell>
                  <TableCell>
                    <Chip size="small" label={u.status} color={u.status === 'ACTIVE' ? 'success' : 'default'} variant="outlined" />
                  </TableCell>
                  <TableCell>{formatDateTime(u.lastLoginAt)}</TableCell>
                  <TableCell align="right"><Button size="small" onClick={() => setEditing({ mode: 'edit', user: u })}>Edit</Button></TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={6} align="center">No users found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={total} page={page} rowsPerPage={size}
          onPageChange={(_, p) => setPage(p)} rowsPerPageOptions={[10, 25, 50]}
          onRowsPerPageChange={(e) => { setSize(Number(e.target.value)); setPage(0) }} />
      </Paper>
      {editing && <UserDialog editing={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </Stack>
  )
}

function UserDialog({ editing, onClose, onSaved }: { editing: Editing; onClose: () => void; onSaved: () => void }) {
  const isEdit = editing.mode === 'edit'
  const u = editing.mode === 'edit' ? editing.user : undefined
  const [form, setForm] = useState<UserForm>({
    username: u?.username ?? '', email: u?.email ?? '', fullName: u?.fullName ?? '',
    role: u?.roles[0] ?? 'BANK_USER', status: u?.status ?? 'ACTIVE', password: '', newPassword: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k: keyof UserForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  const save = async () => {
    setBusy(true); setError('')
    try {
      if (u) await adminApi.updateUser(u.id, { ...form, newPassword: form.newPassword || undefined })
      else await adminApi.createUser(form)
      onSaved()
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? `Edit ${u?.username}` : 'Create user'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {!isEdit && <TextField label="Username" value={form.username} onChange={set('username')} autoComplete="off" />}
          <TextField label="Full name" value={form.fullName} onChange={set('fullName')} />
          <TextField label="Email" type="email" value={form.email} onChange={set('email')} />
          <TextField select label="Role" value={form.role} onChange={set('role')}>
            {ROLES.map((r) => <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>)}
          </TextField>
          {isEdit && (
            <TextField select label="Status" value={form.status} onChange={set('status')}>
              {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          )}
          {isEdit
            ? <TextField label="Reset password (optional)" type="password" autoComplete="new-password"
                value={form.newPassword} onChange={set('newPassword')} helperText="Leave blank to keep the current password." />
            : <TextField label="Initial password" type="password" autoComplete="new-password" value={form.password}
                onChange={set('password')} helperText="12+ characters with upper, lower, digit and symbol." />}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={busy}>{isEdit ? 'Save' : 'Create'}</Button>
      </DialogActions>
    </Dialog>
  )
}
