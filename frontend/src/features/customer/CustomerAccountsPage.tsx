import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, Grid,
  IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { customerApi, errorMessage } from '../../services/api'
import type { AccountSummaryView, TransactionView } from '../../types'
import { formatCurrency, formatDate } from '../../utils/format'

export default function CustomerAccountsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<AccountSummaryView[]>([])
  const [selectedAccount, setSelectedAccount] = useState<AccountSummaryView | null>(null)
  const [transactions, setTransactions] = useState<TransactionView[]>([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const [copied, setCopied] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const accs = await customerApi.accounts()
      setAccounts(accs)
      if (accs.length > 0) {
        setSelectedAccount(accs[0])
        const txns = await customerApi.transactions(accs[0].id)
        setTransactions(txns)
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

  const handleSelectAccount = async (acc: AccountSummaryView) => {
    setSelectedAccount(acc)
    try {
      const txns = await customerApi.transactions(acc.id)
      setTransactions(txns)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleDownloadCsv = () => {
    if (!selectedAccount || transactions.length === 0) return
    const headers = ['Date', 'Reference', 'Description', 'Type', 'Amount', 'Currency', 'Running Balance']
    const rows = transactions.map((t) => [
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
    link.setAttribute('download', `Statement_${selectedAccount.accountNumber}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredTxns = transactions.filter((t) => {
    const matchesSearch = !search || (t.remarks && t.remarks.toLowerCase().includes(search.toLowerCase())) ||
      (t.reference && t.reference.toLowerCase().includes(search.toLowerCase()))
    const matchesType = filterType === 'ALL' || t.transactionType === filterType
    return matchesSearch && matchesType
  })

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
            Accounts & Balances
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View live ledger balances, interest rates, and full transaction history
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          onClick={handleDownloadCsv}
          disabled={!selectedAccount || transactions.length === 0}
        >
          Export CSV Statement
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {/* Account Cards */}
      <Grid container spacing={2}>
        {accounts.map((acc) => {
          const isSelected = selectedAccount?.id === acc.id
          return (
            <Grid item xs={12} md={6} key={acc.id}>
              <Card
                onClick={() => handleSelectAccount(acc)}
                sx={{
                  cursor: 'pointer',
                  borderRadius: 2,
                  border: isSelected ? '2px solid #0066cc' : '1px solid #e0e0e0',
                  boxShadow: isSelected ? '0 4px 12px rgba(0, 102, 204, 0.16)' : 1,
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                        {acc.productName}
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {acc.accountNumber}
                        </Typography>
                        <Tooltip title={copied === acc.accountNumber ? 'Copied!' : 'Copy Account Number'}>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleCopy(acc.accountNumber) }}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                    <Chip label={acc.status} size="small" color={acc.status === 'ACTIVE' ? 'success' : 'default'} sx={{ fontWeight: 600 }} />
                  </Stack>

                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Available Balance</Typography>
                      <Typography variant="h5" fontWeight={800} color="primary.main">
                        {formatCurrency(acc.availableBalance, acc.currency)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Ledger Balance</Typography>
                      <Typography variant="h5" fontWeight={700} color="text.primary">
                        {formatCurrency(acc.balance, acc.currency)}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 1.5 }} />

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">Branch: {acc.branchName}</Typography>
                    <Typography variant="caption" color="text.secondary">Annual Interest: {acc.interestRate}%</Typography>
                    <Typography variant="caption" color="text.secondary">Opened: {formatDate(acc.openDate)}</Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      {/* Account Transactions & Filtering */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Transactions for {selectedAccount?.accountNumber}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total {filteredTxns.length} records found
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <TextField
              placeholder="Search reference or remarks..."
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: { xs: '100%', sm: 240 } }}
            />
            <TextField
              select
              size="small"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="ALL">All Types</MenuItem>
              <MenuItem value="DEPOSIT">Deposit</MenuItem>
              <MenuItem value="WITHDRAWAL">Withdrawal</MenuItem>
              <MenuItem value="TRANSFER_IN">Transfer In</MenuItem>
              <MenuItem value="TRANSFER_OUT">Transfer Out</MenuItem>
            </TextField>
          </Stack>
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
              {filteredTxns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No matching transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTxns.map((t) => {
                  const isCredit = t.transactionType === 'DEPOSIT' || t.transactionType === 'TRANSFER_IN'
                  return (
                    <TableRow key={t.id} hover>
                      <TableCell sx={{ fontSize: 13 }}>{formatDate(t.date)}</TableCell>
                      <TableCell sx={{ fontSize: 13, fontFamily: 'monospace', color: 'text.secondary' }}>
                        {t.reference || `TXN-${t.id}`}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, fontWeight: 500 }}>{t.remarks || 'Transaction'}</TableCell>
                      <TableCell>
                        <Chip
                          icon={isCredit ? <ArrowDownwardIcon sx={{ fontSize: '14px !important' }} /> : <ArrowUpwardIcon sx={{ fontSize: '14px !important' }} />}
                          label={t.transactionType}
                          size="small"
                          color={isCredit ? 'success' : 'error'}
                          variant="outlined"
                          sx={{ fontWeight: 600, fontSize: 11 }}
                        />
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
