import { useEffect, useState } from 'react'
import {
  Alert, Button, Checkbox, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material'
import { adminApi, errorMessage } from '../../services/api'
import type { PermissionView, RoleView } from '../../types'

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleView[]>([])
  const [perms, setPerms] = useState<PermissionView[]>([])
  const [draft, setDraft] = useState<Record<number, Set<string>>>({})
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const load = () => Promise.all([adminApi.roles(), adminApi.permissions()]).then(([r, p]) => {
    setRoles(r); setPerms(p)
    setDraft(Object.fromEntries(r.map((x) => [x.id, new Set(x.permissions)])))
  }).catch((e) => setMsg({ type: 'error', text: errorMessage(e) }))
  useEffect(() => { void load() }, [])

  const toggle = (roleId: number, code: string) => {
    const next = new Set(draft[roleId]); next.has(code) ? next.delete(code) : next.add(code)
    setDraft({ ...draft, [roleId]: next })
  }
  const dirty = (r: RoleView) => {
    const d = draft[r.id]
    return !!d && (d.size !== r.permissions.length || r.permissions.some((p) => !d.has(p)))
  }
  const save = async (r: RoleView) => {
    try {
      const updated = await adminApi.setPermissions(r.id, [...draft[r.id]])
      setRoles(roles.map((x) => (x.id === r.id ? updated : x)))
      setMsg({ type: 'success', text: `${r.name} saved. Users pick this up at their next session refresh or sign-in.` })
    } catch (e) { setMsg({ type: 'error', text: errorMessage(e) }) }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Roles and permissions</Typography>
      <Typography color="text.secondary">The Administrator role is fixed so the portal can never be left without an admin.</Typography>
      {msg && <Alert severity={msg.type} onClose={() => setMsg(null)}>{msg.text}</Alert>}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Permission</TableCell>
                {roles.map((r) => <TableCell key={r.id} align="center">{r.name}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {perms.map((p) => (
                <TableRow key={p.code} hover>
                  <TableCell>{p.code}<Typography variant="caption" color="text.secondary" display="block">{p.description}</Typography></TableCell>
                  {roles.map((r) => (
                    <TableCell key={r.id} align="center">
                      <Checkbox size="small" checked={draft[r.id]?.has(p.code) ?? false} disabled={r.name === 'ADMIN'}
                        onChange={() => toggle(r.id, p.code)} inputProps={{ 'aria-label': `${r.name} ${p.code}` }} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              <TableRow>
                <TableCell />
                {roles.map((r) => (
                  <TableCell key={r.id} align="center">
                    <Button size="small" variant="contained" disabled={r.name === 'ADMIN' || !dirty(r)} onClick={() => save(r)}>Save</Button>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  )
}
