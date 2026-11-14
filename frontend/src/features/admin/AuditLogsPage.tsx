import { useCallback, useEffect, useState } from 'react'
import {
  Alert, Chip, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import { adminApi, errorMessage } from '../../services/api'
import type { AuditLogView } from '../../types'
import { formatDateTime } from '../../utils/format'

const OUTCOMES = ['SUCCESS', 'FAILURE', 'DENIED', 'ACCEPTED']
const color = (o: string) => (o === 'SUCCESS' ? 'success' : o === 'FAILURE' || o === 'DENIED' ? 'error' : 'default')

export default function AuditLogsPage() {
  const [rows, setRows] = useState<AuditLogView[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(25)
  const [action, setAction] = useState('')
  const [actor, setActor] = useState('')
  const [outcome, setOutcome] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    adminApi.auditLogs({ action, actor, outcome, page, size })
      .then((r) => { setRows(r.items); setTotal(r.total); setError('') })
      .catch((e) => setError(errorMessage(e)))
  }, [action, actor, outcome, page, size])
  useEffect(() => { load() }, [load])

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Audit log</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField size="small" label="Action (exact, e.g. LOGIN)" value={action}
          onChange={(e) => { setAction(e.target.value.toUpperCase()); setPage(0) }} />
        <TextField size="small" label="Actor contains" value={actor} onChange={(e) => { setActor(e.target.value); setPage(0) }} />
        <TextField size="small" select label="Outcome" value={outcome} sx={{ minWidth: 150 }}
          onChange={(e) => { setOutcome(e.target.value); setPage(0) }}>
          <MenuItem value="">Any</MenuItem>
          {OUTCOMES.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </TextField>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell><TableCell>Actor</TableCell><TableCell>Action</TableCell>
                <TableCell>Resource</TableCell><TableCell>Outcome</TableCell><TableCell>IP</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <Tooltip key={r.id} placement="top-start" title={<code style={{ whiteSpace: 'pre-wrap' }}>{r.details}</code>}>
                  <TableRow hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(r.createdAt)}</TableCell>
                    <TableCell>{r.actorUsername ?? '—'}</TableCell>
                    <TableCell>{r.action}</TableCell>
                    <TableCell>{r.resourceType ? `${r.resourceType}${r.resourceId ? ` #${r.resourceId}` : ''}` : '—'}</TableCell>
                    <TableCell><Chip size="small" variant="outlined" label={r.outcome} color={color(r.outcome)} /></TableCell>
                    <TableCell>{r.ipAddress ?? '—'}</TableCell>
                  </TableRow>
                </Tooltip>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={6} align="center">No events match.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={total} page={page} rowsPerPage={size}
          onPageChange={(_, p) => setPage(p)} rowsPerPageOptions={[25, 50, 100]}
          onRowsPerPageChange={(e) => { setSize(Number(e.target.value)); setPage(0) }} />
      </Paper>
    </Stack>
  )
}
