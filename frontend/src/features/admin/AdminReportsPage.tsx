import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Grid, Paper,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import { adminApi, errorMessage } from '../../services/api'
import type { TransactionReportSummary } from '../../types'
import { formatCurrency, formatDateTime } from '../../utils/format'

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<TransactionReportSummary | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await adminApi.reports()
      setReport(data)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleExportCsv = () => {
    if (!report || report.recentTransactions.length === 0) return
    const headers = ['ID', 'Initiator', 'From Account', 'To Beneficiary', 'Amount', 'Currency', 'Remarks', 'Status', 'Fineract Reference', 'Date']
    const rows = report.recentTransactions.map((t) => [
      t.id,
      t.created_by_username,
      t.from_account_id,
      `"${(t.to_account_name || '').replace(/"/g, '""')}"`,
      t.amount,
      t.currency,
      `"${(t.remarks || '').replace(/"/g, '""')}"`,
      t.status,
      t.fineract_transfer_ref || '',
      t.created_at,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Admin_Transaction_Report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  const txns = report?.recentTransactions || []

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Transaction & Operations Reports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            System-wide transaction volume, settlement aggregates, and detailed journal logs
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<FileDownloadIcon />}
          onClick={handleExportCsv}
          disabled={!report || txns.length === 0}
          sx={{ fontWeight: 600 }}
        >
          Export CSV Report
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {/* KPI Summary */}
      {report && (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                  Total Transfer Requests
                </Typography>
                <Typography variant="h4" fontWeight={800} color="primary.main" sx={{ mt: 0.5 }}>
                  {report.totalTransfers}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Submitted via portal or API
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                  Completed Volume Settled
                </Typography>
                <Typography variant="h4" fontWeight={800} color="success.main" sx={{ mt: 0.5 }}>
                  {formatCurrency(report.totalVolumeCompleted)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Debited & credited via core engine
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                  Pending Authorization Volume
                </Typography>
                <Typography variant="h4" fontWeight={800} color="warning.main" sx={{ mt: 0.5 }}>
                  {formatCurrency(report.totalVolumePending)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Awaiting bank user maker-checker decision
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Status Breakdown Chips */}
      {report && (
        <Paper sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            STATUS DISTRIBUTION
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {Object.entries(report.statusCounts).map(([status, cnt]) => (
              <Chip
                key={status}
                label={`${status}: ${cnt} requests`}
                color={status === 'COMPLETED' ? 'success' : status === 'PENDING_APPROVAL' ? 'warning' : 'default'}
                sx={{ fontWeight: 600, py: 2, px: 1 }}
              />
            ))}
          </Stack>
        </Paper>
      )}

      {/* Recent Transactions Journal */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              System-wide Transaction Journal
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Showing recent 50 core transactions across all customer accounts
            </Typography>
          </Box>
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Initiator</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>From Account</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>To Beneficiary</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {txns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No transactions recorded.
                  </TableCell>
                </TableRow>
              ) : (
                txns.map((t) => (
                  <TableRow key={t.id} hover>
                    <TableCell sx={{ fontSize: 13 }}>{formatDateTime(t.created_at)}</TableCell>
                    <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{t.created_by_username}</TableCell>
                    <TableCell sx={{ fontSize: 13, fontFamily: 'monospace' }}>#{t.from_account_id}</TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{t.to_account_name}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(t.amount, t.currency)}</TableCell>
                    <TableCell sx={{ fontSize: 13, fontFamily: 'monospace', color: 'text.secondary' }}>
                      {t.fineract_transfer_ref || '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t.status}
                        size="small"
                        color={t.status === 'COMPLETED' ? 'success' : t.status === 'PENDING_APPROVAL' ? 'warning' : 'error'}
                        sx={{ fontWeight: 700, fontSize: 11 }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  )
}
