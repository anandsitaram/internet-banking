import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Grid,
  MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Typography,
} from '@mui/material'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import PrintIcon from '@mui/icons-material/Print'
import { customerApi, errorMessage } from '../../services/api'
import type { AccountSummaryView, StatementView } from '../../types'
import { formatCurrency, formatDate } from '../../utils/format'

export default function CustomerStatementsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<AccountSummaryView[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<number>(0)
  const [statement, setStatement] = useState<StatementView | null>(null)
  const [dateRange, setDateRange] = useState('ALL')

  const loadData = async () => {
    try {
      setLoading(true)
      const accs = await customerApi.accounts()
      setAccounts(accs)
      if (accs.length > 0) {
        setSelectedAccountId(accs[0].id)
        const stmt = await customerApi.statement(accs[0].id)
        setStatement(stmt)
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleFetchStatement = async (accId: number, range: string) => {
    setSelectedAccountId(accId)
    setDateRange(range)
    try {
      let fromDate: string | undefined
      const now = new Date()
      if (range === '30') {
        fromDate = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
      } else if (range === '90') {
        fromDate = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10)
      } else if (range === 'YTD') {
        fromDate = `${now.getFullYear()}-01-01`
      }
      const stmt = await customerApi.statement(accId, fromDate)
      setStatement(stmt)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const handleDownloadCsv = () => {
    if (!statement || statement.transactions.length === 0) return
    const headers = ['Date', 'Reference', 'Description', 'Type', 'Amount', 'Currency', 'Running Balance']
    const rows = statement.transactions.map((t) => [
      t.date,
      t.reference || `TXN-${t.id}`,
      `"${(t.remarks || '').replace(/"/g, '""')}"`,
      t.transactionType,
      t.amount,
      t.currency,
      t.runningBalance,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Account_Statement_${statement.accountNumber}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    window.print()
  }

  const selectedAcc = accounts.find((a) => a.id === selectedAccountId)
  const txns = statement?.transactions || []
  const totalInflow = txns.filter((t) => t.transactionType === 'DEPOSIT' || t.transactionType === 'TRANSFER_IN').reduce((s, t) => s + t.amount, 0)
  const totalOutflow = txns.filter((t) => t.transactionType === 'WITHDRAWAL' || t.transactionType === 'TRANSFER_OUT').reduce((s, t) => s + t.amount, 0)

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Account Statements
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generate and export official core banking statements with transaction breakdown
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
            Print Statement
          </Button>
          <Button variant="contained" startIcon={<FileDownloadIcon />} onClick={handleDownloadCsv}>
            Download CSV
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {/* Filter Controls */}
      <Paper sx={{ p: 2.5, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Select Account"
              value={selectedAccountId}
              onChange={(e) => handleFetchStatement(Number(e.target.value), dateRange)}
              fullWidth
              size="small"
            >
              {accounts.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.accountNumber} — {a.productName} ({formatCurrency(a.availableBalance, a.currency)})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Period / Date Range"
              value={dateRange}
              onChange={(e) => handleFetchStatement(selectedAccountId, e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="ALL">All Available History</MenuItem>
              <MenuItem value="30">Last 30 Days</MenuItem>
              <MenuItem value="90">Last 90 Days</MenuItem>
              <MenuItem value="YTD">Year to Date (YTD)</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Metrics */}
      {selectedAcc && statement && (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">Opening Balance</Typography>
                <Typography variant="h6" fontWeight={700}>{formatCurrency(statement.openingBalance, statement.currency)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">Total Inflows (+)</Typography>
                <Typography variant="h6" fontWeight={700} color="success.main">+{formatCurrency(totalInflow, statement.currency)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">Total Outflows (-)</Typography>
                <Typography variant="h6" fontWeight={700} color="error.main">-{formatCurrency(totalOutflow, statement.currency)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">Closing Available Balance</Typography>
                <Typography variant="h6" fontWeight={800} color="primary.main">{formatCurrency(selectedAcc.availableBalance, selectedAcc.currency)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Statement Table View */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              Detailed Transaction Journal
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Official statement records for {statement?.accountNumber} · Total transactions: {statement?.totalTransactions}
            </Typography>
          </Box>
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Balance After</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {txns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No transactions recorded during this period.
                  </TableCell>
                </TableRow>
              ) : (
                txns.map((t) => {
                  const isCredit = t.transactionType === 'DEPOSIT' || t.transactionType === 'TRANSFER_IN'
                  return (
                    <TableRow key={t.id} hover>
                      <TableCell sx={{ fontSize: 13 }}>{formatDate(t.date)}</TableCell>
                      <TableCell sx={{ fontSize: 13, fontFamily: 'monospace', color: 'text.secondary' }}>
                        {t.reference || `TXN-${t.id}`}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, fontWeight: 500 }}>{t.remarks || 'Transaction'}</TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: isCredit ? 'success.main' : 'error.main', fontWeight: 700 }}>
                          {t.transactionType}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: isCredit ? 'success.main' : 'error.main' }}>
                        {isCredit ? '+' : '-'}{formatCurrency(t.amount, t.currency)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, fontSize: 13 }}>
                        {formatCurrency(t.runningBalance, t.currency)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  )
}
