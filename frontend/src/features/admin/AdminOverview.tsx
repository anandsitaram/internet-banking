import { useEffect, useState } from 'react'
import { Alert, Chip, Grid2 as Grid, Paper, Skeleton, Stack, Typography } from '@mui/material'
import { adminApi, errorMessage } from '../../services/api'
import { ROLE_LABELS, type FineractStatus, type Overview, type RoleName } from '../../types'

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      {value === undefined ? <Skeleton width={60} height={44} /> : <Typography variant="h4">{value}</Typography>}
    </Paper>
  )
}

export default function AdminOverview() {
  const [data, setData] = useState<Overview>()
  const [engine, setEngine] = useState<FineractStatus | 'ERROR'>()
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi.overview().then(setData).catch((e) => setError(errorMessage(e)))
    adminApi.fineractStatus().then(setEngine).catch(() => setEngine('ERROR'))
  }, [])

  const chip = () => {
    if (!engine) return <Chip label="Checking…" size="small" />
    if (engine === 'ERROR') return <Chip label="Unknown" size="small" />
    if (engine.engine === 'DOWN') return <Chip label="Banking engine down" color="error" size="small" />
    return engine.serviceCredentials === 'OK'
      ? <Chip label="Banking engine up" color="success" size="small" />
      : <Chip label="Engine up, service credentials rejected" color="warning" size="small" />
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Typography variant="h4">Administration</Typography>
        {chip()}
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <Grid container spacing={2}>
        {(Object.keys(ROLE_LABELS) as RoleName[]).map((r) => (
          <Grid key={r} size={{ xs: 12, sm: 4 }}><Stat label={`${ROLE_LABELS[r]} accounts`} value={data?.usersByRole[r]} /></Grid>
        ))}
        <Grid size={{ xs: 12, sm: 4 }}><Stat label="Locked or disabled users" value={data?.inactiveOrLockedUsers} /></Grid>
        <Grid size={{ xs: 12, sm: 4 }}><Stat label="Failed sign-ins, 24 h" value={data?.failedLogins24h} /></Grid>
        <Grid size={{ xs: 12, sm: 4 }}><Stat label="Access denials, 24 h" value={data?.accessDenied24h} /></Grid>
      </Grid>
    </Stack>
  )
}
