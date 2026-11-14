import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress,
  MenuItem, Paper, Stack, Tab, Tabs, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import HistoryIcon from '@mui/icons-material/History'
import { beneficiariesApi, customerApi, errorMessage, transfersApi } from '../../services/api'
import type { AccountSummaryView, BeneficiaryView, TransferResponse } from '../../types'
import { formatCurrency, formatDateTime } from '../../utils/format'

export default function CustomerTransfersPage() {
  const [tab, setTab] = useState(0)
  const [accounts, setAccounts] = useState<AccountSummaryView[]>([])
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryView[]>([])
  const [transfers, setTransfers] = useState<TransferResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form
  const [fromAccountId, setFromAccountId] = useState<number>(0)
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<TransferResponse | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const [accs, bens, txList] = await Promise.all([
        customerApi.accounts(),
        beneficiariesApi.list(),
        transfersApi.list(),
      ])
      setAccounts(accs)
      setBeneficiaries(bens)
      setTransfers(txList)
      if (accs.length > 0) setFromAccountId(accs[0].id)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleTransfer = async () => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid transfer amount.')
      return
    }
    const toAccNum = parseInt(toAccountId.replace(/\D/g, ''), 10) || 10003
    const ben = beneficiaries.find((b) => b.accountReference === toAccountId)

    try {
      setSubmitting(true)
      setError(null)
      const res = await transfersApi.initiate({
        fromAccountId,
        toAccountId: toAccNum,
        toAccountName: ben ? ben.beneficiaryName : 'Direct Account',
        toAccountNumber: toAccountId,
        amount: numAmount,
        currency: 'INR',
        remarks: remarks || 'Demo fund transfer',
      })
      setResult(res)
      // Refresh
      const [updatedAccs, updatedTxList] = await Promise.all([
        customerApi.accounts(),
        transfersApi.list(),
      ])
      setAccounts(updatedAccs)
      setTransfers(updatedTxList)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setAmount('')
    setRemarks('')
    setToAccountId('')
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
          Fund Transfers
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Transfer money between accounts or to saved beneficiaries with maker-checker security
        </Typography>
      </Box>

      <Paper sx={{ borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab icon={<SendIcon />} iconPosition="start" label="Initiate Transfer" sx={{ fontWeight: 600 }} />
          <Tab icon={<HistoryIcon />} iconPosition="start" label={`Transfer History (${transfers.length})`} sx={{ fontWeight: 600 }} />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ p: 3, maxWidth: 650 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {result ? (
              <Stack spacing={2.5} alignItems="center" sx={{ py: 3 }}>
                {result.status === 'COMPLETED' ? (
                  <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main' }} />
                ) : (
                  <WarningAmberIcon sx={{ fontSize: 72, color: 'warning.main' }} />
                )}
                <Typography variant="h5" fontWeight={700}>
                  {result.status === 'COMPLETED' ? 'Transfer Successful!' : 'Pending Approval'}
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  {result.message}
                </Typography>

                <Paper variant="outlined" sx={{ p: 2.5, width: '100%', bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">Transaction Reference:</Typography>
                      <Typography variant="caption" fontWeight={700} fontFamily="monospace">{result.reference}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">Amount Transferred:</Typography>
                      <Typography variant="caption" fontWeight={700}>{formatCurrency(result.amount, result.currency)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">To Account:</Typography>
                      <Typography variant="caption" fontWeight={600}>{result.toAccountName} ({result.toAccountNumber})</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">Workflow Status:</Typography>
                      <Chip label={result.status} size="small" color={result.status === 'COMPLETED' ? 'success' : 'warning'} sx={{ fontWeight: 700 }} />
                    </Stack>
                  </Stack>
                </Paper>

                <Button variant="contained" onClick={handleReset} sx={{ mt: 2, px: 4 }}>
                  Make Another Transfer
                </Button>
              </Stack>
            ) : (
              <Stack spacing={2.5}>
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
                      {a.accountNumber} — {a.productName} (Available: {formatCurrency(a.availableBalance, a.currency)})
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Destination Account or Beneficiary"
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  placeholder="Select saved beneficiary or enter account reference"
                  fullWidth
                  size="small"
                />

                {beneficiaries.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
                      SAVED BENEFICIARIES:
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                      {beneficiaries.map((b) => (
                        <Chip
                          key={b.id}
                          label={`${b.beneficiaryName} (${b.accountReference})`}
                          onClick={() => setToAccountId(b.accountReference)}
                          color={toAccountId === b.accountReference ? 'primary' : 'default'}
                          variant={toAccountId === b.accountReference ? 'filled' : 'outlined'}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                <TextField
                  label="Amount (INR)"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  fullWidth
                  size="small"
                />

                {parseFloat(amount) > 25000 && (
                  <Alert severity="warning" sx={{ fontSize: 13 }}>
                    <strong>Maker-Checker Policy Advisory:</strong> Transfers exceeding ₹25,000 require authorization by Bank User staff before funds are debited.
                  </Alert>
                )}

                <TextField
                  label="Transfer Remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Utility bill, rent, consulting fee"
                  fullWidth
                  size="small"
                />

                <Button
                  variant="contained"
                  onClick={handleTransfer}
                  disabled={submitting || !amount || !toAccountId}
                  startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                  sx={{ py: 1.2, fontWeight: 700 }}
                >
                  {submitting ? 'Processing Transfer...' : 'Confirm & Send Money'}
                </Button>
              </Stack>
            )}
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ p: 2 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Initiated Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Beneficiary</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Remarks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transfers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No transfers initiated yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transfers.map((tx) => (
                      <TableRow key={tx.id} hover>
                        <TableCell sx={{ fontSize: 13 }}>{formatDateTime(tx.createdAt)}</TableCell>
                        <TableCell sx={{ fontSize: 13, fontFamily: 'monospace', color: 'text.secondary' }}>
                          {tx.reference}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>
                          {tx.toAccountName} ({tx.toAccountNumber})
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {formatCurrency(tx.amount, tx.currency)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={tx.status}
                            size="small"
                            color={
                              tx.status === 'COMPLETED' ? 'success' :
                              tx.status === 'PENDING_APPROVAL' ? 'warning' : 'error'
                            }
                            sx={{ fontWeight: 700, fontSize: 11 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>
                          {tx.message}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>
    </Stack>
  )
}
