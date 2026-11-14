import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Divider, Grid,
  Paper, Stack, TextField, Typography,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import ShieldIcon from '@mui/icons-material/Shield'
import { adminApi, errorMessage } from '../../services/api'
import { formatCurrency } from '../../utils/format'

export default function AdminLimitsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Editable values
  const [singleLimit, setSingleLimit] = useState<string>('100000')
  const [dailyLimit, setDailyLimit] = useState<string>('500000')
  const [approvalThreshold, setApprovalThreshold] = useState<string>('25000')

  const loadData = async () => {
    try {
      setLoading(true)
      const list = await adminApi.limits()
      const s = list.find((l) => l.code === 'SINGLE_TRANSFER_LIMIT')?.value
      const d = list.find((l) => l.code === 'DAILY_TRANSFER_LIMIT')?.value
      const a = list.find((l) => l.code === 'APPROVAL_THRESHOLD')?.value
      if (s !== undefined) setSingleLimit(String(s))
      if (d !== undefined) setDailyLimit(String(d))
      if (a !== undefined) setApprovalThreshold(String(a))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)
      await Promise.all([
        adminApi.updateLimit('SINGLE_TRANSFER_LIMIT', parseFloat(singleLimit) || 100000),
        adminApi.updateLimit('DAILY_TRANSFER_LIMIT', parseFloat(dailyLimit) || 500000),
        adminApi.updateLimit('APPROVAL_THRESHOLD', parseFloat(approvalThreshold) || 25000),
      ])
      setSuccessMsg('Transaction limits and approval threshold updated successfully.')
      await loadData()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          Transaction Limits & Policy
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure maximum transfer caps and maker-checker dual authorization thresholds
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {successMsg && <Alert severity="success" onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper component="form" onSubmit={handleSave} sx={{ p: 3, borderRadius: 2 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Policy Configuration
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Changes take effect immediately for all customer accounts and transfers
                </Typography>
              </Box>

              <TextField
                label="Single Transfer Limit (INR)"
                type="number"
                value={singleLimit}
                onChange={(e) => setSingleLimit(e.target.value)}
                helperText="Maximum allowed amount for any single fund transfer transaction."
                fullWidth
                size="small"
                required
              />

              <TextField
                label="Daily Cumulative Limit (INR)"
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                helperText="Maximum total amount a customer can transfer within a 24-hour window."
                fullWidth
                size="small"
                required
              />

              <TextField
                label="Maker-Checker Approval Threshold (INR)"
                type="number"
                value={approvalThreshold}
                onChange={(e) => setApprovalThreshold(e.target.value)}
                helperText="Transfers exceeding this amount require review & authorization by a Bank User before execution."
                fullWidth
                size="small"
                required
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                  disabled={saving}
                  sx={{ px: 4, py: 1.2, fontWeight: 700 }}
                >
                  {saving ? 'Saving...' : 'Save Limit Policy'}
                </Button>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2, bgcolor: 'rgba(0, 102, 204, 0.04)', border: '1px solid rgba(0, 102, 204, 0.15)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                <ShieldIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={700}>
                  Security Rules
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>Maker-Checker Dual Control:</strong> Initiators of transfer requests are strictly prevented from approving their own submissions.
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary" display="block">
                CURRENT LIMIT SUMMARY:
              </Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption">Single Max:</Typography>
                  <Typography variant="caption" fontWeight={700}>{formatCurrency(parseFloat(singleLimit) || 0)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption">Daily Max:</Typography>
                  <Typography variant="caption" fontWeight={700}>{formatCurrency(parseFloat(dailyLimit) || 0)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption">Approval Threshold:</Typography>
                  <Typography variant="caption" fontWeight={700} color="warning.main">{formatCurrency(parseFloat(approvalThreshold) || 0)}</Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )
}
