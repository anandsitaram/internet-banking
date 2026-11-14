import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Grid, IconButton, MenuItem, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { useAuth } from '../../contexts/AuthContext'
import { beneficiariesApi, customerApi, errorMessage, transfersApi } from '../../services/api'
import type { AccountSummaryView, BeneficiaryView, TransactionView, TransferResponse } from '../../types'
import { formatCurrency, formatDate } from '../../utils/format'

export default function CustomerHome() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<AccountSummaryView[]>([])
  const [selectedAccount, setSelectedAccount] = useState<AccountSummaryView | null>(null)
  const [transactions, setTransactions] = useState<TransactionView[]>([])
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryView[]>([])

  // Quick Transfer Modal State
  const [transferOpen, setTransferOpen] = useState(false)
  const [fromAccountId, setFromAccountId] = useState<number>(0)
  const [toAccountId, setToAccountId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [remarks, setRemarks] = useState<string>('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferResult, setTransferResult] = useState<TransferResponse | null>(null)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [accs, bens] = await Promise.all([
        customerApi.accounts(),
        beneficiariesApi.list(),
      ])
      setAccounts(accs)
      setBeneficiaries(bens)
      if (accs.length > 0) {
        const primary = accs[0]
        setSelectedAccount(primary)
        setFromAccountId(primary.id)
        const txns = await customerApi.transactions(primary.id)
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
    setFromAccountId(acc.id)
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

  const handleOpenTransfer = (targetAcc?: string) => {
    if (targetAcc) setToAccountId(targetAcc)
    setTransferResult(null)
    setTransferError(null)
    setAmount('')
    setRemarks('')
    setTransferOpen(true)
  }

  const handleExecuteTransfer = async () => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setTransferError('Please enter a valid amount greater than zero.')
      return
    }
    const toAccNum = parseInt(toAccountId.replace(/\D/g, ''), 10) || 10003

    try {
      setTransferLoading(true)
      setTransferError(null)
      const ben = beneficiaries.find((b) => b.accountReference === toAccountId)
      const res = await transfersApi.initiate({
        fromAccountId,
        toAccountId: toAccNum,
        toAccountName: ben ? ben.beneficiaryName : 'Direct Transfer',
        toAccountNumber: toAccountId,
        amount: numAmount,
        currency: selectedAccount?.currency || 'INR',
        remarks: remarks || 'Demo Online Transfer',
      })
      setTransferResult(res)
      // Refresh balances
      await loadData()
    } catch (err) {
      setTransferError(errorMessage(err))
    } finally {
      setTransferLoading(false)
    }
  }

  const totalBalance = accounts.reduce((sum, a) => sum + (a.availableBalance || 0), 0)

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Stack spacing={3}>
      {/* Welcome Banner */}
      <Paper
        sx={{
          p: 3,
          background: 'linear-gradient(135deg, #0d3b66 0%, #001e3d 100%)',
          color: '#ffffff',
          borderRadius: 2,
        }}
      >
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs={12} md={8}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography variant="h5" fontWeight={700}>
                Welcome back, {user?.fullName}
              </Typography>
              <Chip
                icon={<VerifiedUserIcon sx={{ color: '#00e676 !important', fontSize: 18 }} />}
                label="KYC Verified"
                size="small"
                sx={{ bgcolor: 'rgba(0, 230, 118, 0.15)', color: '#00e676', fontWeight: 600 }}
              />
            </Stack>
            <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
              Core Banking Engine: Apache Fineract · Demo Sandbox Money · Double-entry bookkeeping
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Typography variant="caption" sx={{ opacity: 0.8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Total Available Liquidity
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#00e676' }}>
              {formatCurrency(totalBalance)}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}

      {/* Quick Actions Row */}
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={() => handleOpenTransfer()}
          sx={{ bgcolor: '#0066cc', fontWeight: 600, px: 3, py: 1 }}
        >
          Transfer Funds
        </Button>
        <Button
          variant="outlined"
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => handleOpenTransfer()}
          sx={{ fontWeight: 600 }}
        >
          Pay Beneficiary
        </Button>
      </Stack>

      {/* Linked Accounts Carousel / Cards */}
      <Box>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Linked Savings Accounts ({accounts.length})
        </Typography>
        <Grid container spacing={2}>
          {accounts.map((acc) => {
            const isSelected = selectedAccount?.id === acc.id
            return (
              <Grid item xs={12} sm={6} md={6} key={acc.id}>
                <Card
                  onClick={() => handleSelectAccount(acc)}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    borderRadius: 2,
                    border: isSelected ? '2px solid #0066cc' : '1px solid #e0e0e0',
                    boxShadow: isSelected ? '0 4px 12px rgba(0, 102, 204, 0.18)' : 1,
                    position: 'relative',
                    overflow: 'hidden',
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
                      <Chip
                        label={acc.status}
                        size="small"
                        color={acc.status === 'ACTIVE' ? 'success' : 'default'}
                        sx={{ fontWeight: 600, fontSize: 11 }}
                      />
                    </Stack>

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Available Balance
                      </Typography>
                      <Typography variant="h5" fontWeight={800} color="primary.main">
                        {formatCurrency(acc.availableBalance, acc.currency)}
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        Branch: {acc.branchName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Interest: {acc.interestRate}% p.a.
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      </Box>

      {/* Quick Beneficiary Shortcuts */}
      {beneficiaries.length > 0 && (
        <Paper sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" gutterBottom>
            FREQUENT BENEFICIARIES (1-CLICK SEND)
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', py: 1 }}>
            {beneficiaries.map((b) => (
              <Chip
                key={b.id}
                icon={<AccountBalanceWalletIcon />}
                label={`${b.beneficiaryName} (${b.nickname})`}
                onClick={() => handleOpenTransfer(b.accountReference)}
                variant="outlined"
                clickable
                sx={{
                  py: 2.2,
                  px: 1,
                  fontWeight: 600,
                  borderColor: '#0066cc',
                  '&:hover': { bgcolor: 'rgba(0, 102, 204, 0.08)' },
                }}
              />
            ))}
          </Stack>
        </Paper>
      )}

      {/* Recent Transactions Table */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Transaction Ledger
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Showing core transactions for {selectedAccount?.accountNumber} ({selectedAccount?.productName})
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
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No transactions found for this account.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((t) => {
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

      {/* Transfer Funds Modal */}
      <Dialog open={transferOpen} onClose={() => setTransferOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Initiate Fund Transfer</DialogTitle>
        <DialogContent dividers>
          {transferResult ? (
            <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
              {transferResult.status === 'COMPLETED' ? (
                <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main' }} />
              ) : (
                <WarningAmberIcon sx={{ fontSize: 64, color: 'warning.main' }} />
              )}
              <Typography variant="h6" fontWeight={700}>
                {transferResult.status === 'COMPLETED' ? 'Transfer Completed!' : 'Approval Required'}
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                {transferResult.message}
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, width: '100%', bgcolor: 'rgba(0,0,0,0.02)' }}>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Reference ID:</Typography>
                    <Typography variant="caption" fontWeight={700} fontFamily="monospace">{transferResult.reference}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Amount:</Typography>
                    <Typography variant="caption" fontWeight={700}>{formatCurrency(transferResult.amount, transferResult.currency)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">Status:</Typography>
                    <Chip label={transferResult.status} size="small" color={transferResult.status === 'COMPLETED' ? 'success' : 'warning'} sx={{ fontWeight: 700 }} />
                  </Stack>
                </Stack>
              </Paper>
            </Stack>
          ) : (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              {transferError && <Alert severity="error">{transferError}</Alert>}

              {/* Source Account */}
              <TextField
                select
                label="From Account"
                value={fromAccountId}
                onChange={(e) => setFromAccountId(Number(e.target.value))}
                fullWidth
                size="small"
              >
                {accounts.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.accountNumber} — {a.productName} ({formatCurrency(a.availableBalance, a.currency)})
                  </MenuItem>
                ))}
              </TextField>

              {/* Destination */}
              <TextField
                label="Destination Account or Beneficiary"
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                placeholder="e.g. ACC-10003 or select below"
                fullWidth
                size="small"
                helperText="Enter account number or select a saved beneficiary"
              />

              {beneficiaries.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                  {beneficiaries.map((b) => (
                    <Chip
                      key={b.id}
                      label={`${b.nickname} (${b.accountReference})`}
                      size="small"
                      onClick={() => setToAccountId(b.accountReference)}
                      variant={toAccountId === b.accountReference ? 'filled' : 'outlined'}
                      color={toAccountId === b.accountReference ? 'primary' : 'default'}
                    />
                  ))}
                </Stack>
              )}

              {/* Amount */}
              <TextField
                label="Amount (INR)"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                fullWidth
                size="small"
              />

              {/* Maker Checker Threshold Advisory */}
              {parseFloat(amount) > 25000 && (
                <Alert severity="warning" sx={{ fontSize: 13 }}>
                  <strong>Maker-Checker Policy:</strong> Transfers over ₹25,000 require review and authorization by Bank User staff.
                </Alert>
              )}

              {/* Remarks */}
              <TextField
                label="Remarks / Reference Note"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Invoice #2026, Rent payment"
                fullWidth
                size="small"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          {transferResult ? (
            <Button variant="contained" onClick={() => setTransferOpen(false)}>Done</Button>
          ) : (
            <>
              <Button onClick={() => setTransferOpen(false)} disabled={transferLoading}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleExecuteTransfer}
                disabled={transferLoading || !amount || !toAccountId}
                startIcon={transferLoading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
              >
                {transferLoading ? 'Processing...' : 'Confirm Transfer'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
