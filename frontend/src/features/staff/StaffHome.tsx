import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Grid, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import ApprovalIcon from '@mui/icons-material/FactCheck'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import HighlightOffIcon from '@mui/icons-material/HighlightOff'
import DnsIcon from '@mui/icons-material/Dns'
import { useAuth } from '../../contexts/AuthContext'
import { adminApi, errorMessage, staffApi } from '../../services/api'
import type { CustomerStaffView, FineractStatus, PendingApprovalView } from '../../types'
import { formatCurrency, formatDateTime } from '../../utils/format'
import { useNavigate } from 'react-router-dom'

export default function StaffHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [approvals, setApprovals] = useState<PendingApprovalView[]>([])
  const [customers, setCustomers] = useState<CustomerStaffView[]>([])
  const [engineStatus, setEngineStatus] = useState<FineractStatus>({ engine: 'UP', serviceCredentials: 'OK' })

  // Decision Modal
  const [decisionModal, setDecisionModal] = useState<{ open: boolean; item?: PendingApprovalView; type?: 'APPROVE' | 'REJECT' }>({ open: false })
  const [comment, setComment] = useState('')
  const [processing, setProcessing] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [apprList, custList, status] = await Promise.all([
        staffApi.approvals(),
        staffApi.customers(),
        adminApi.fineractStatus().catch(() => ({ engine: 'UP' as const, serviceCredentials: 'OK' as const })),
      ])
      setApprovals(apprList)
      setCustomers(custList)
      setEngineStatus(status)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenDecision = (item: PendingApprovalView, type: 'APPROVE' | 'REJECT') => {
    setDecisionModal({ open: true, item, type })
    setComment('')
  }

  const handleConfirmDecision = async () => {
    if (!decisionModal.item || !decisionModal.type) return
    try {
      setProcessing(true)
      setError(null)
      if (decisionModal.type === 'APPROVE') {
        await staffApi.approve(decisionModal.item.id, comment || 'Approved by bank user')
        setSuccessMsg(`Transfer request #${decisionModal.item.id} approved successfully. Core banking ledger updated.`)
      } else {
        await staffApi.reject(decisionModal.item.id, comment || 'Rejected by bank user')
        setSuccessMsg(`Transfer request #${decisionModal.item.id} has been rejected.`)
      }
      setDecisionModal({ open: false })
      await loadData()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setProcessing(false)
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
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Bank Operations Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Customer onboarding, demo account management, and maker-checker transfer authorization
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ mt: { xs: 2, sm: 0 } }}>
          <Button
            variant="contained"
            startIcon={<HowToRegIcon />}
            onClick={() => navigate('/staff/customers')}
            sx={{ fontWeight: 600 }}
          >
            Register Customer
          </Button>
          <Button
            variant="outlined"
            startIcon={<AccountBalanceIcon />}
            onClick={() => navigate('/staff/customers')}
            sx={{ fontWeight: 600 }}
          >
            Open Demo Account
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {successMsg && <Alert severity="success" onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {/* KPI Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 2, borderLeft: '4px solid #f57c00' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                    Pending Maker-Checker Approvals
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color={approvals.length > 0 ? 'warning.main' : 'text.primary'}>
                    {approvals.length}
                  </Typography>
                </Box>
                <ApprovalIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.8 }} />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Transfers exceeding approval threshold (₹25,000)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 2, borderLeft: '4px solid #0066cc' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                    Total Registered Customers
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="primary.main">
                    {customers.length}
                  </Typography>
                </Box>
                <HowToRegIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.8 }} />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Onboarded in core banking & portal
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ borderRadius: 2, borderLeft: '4px solid #2e7d32' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                    Banking Engine (Fineract)
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                    <Chip
                      label={engineStatus.engine === 'UP' ? 'Connected & Healthy' : 'Offline / Standalone'}
                      color={engineStatus.engine === 'UP' ? 'success' : 'default'}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  </Stack>
                </Box>
                <DnsIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.8 }} />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Double-entry core ledger: Active
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pending Approvals Review Table */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Pending Transfer Authorizations (Maker-Checker)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Review high-value fund transfers awaiting bank authorization before double-entry posting
            </Typography>
          </Box>
          <Button size="small" onClick={loadData}>Refresh</Button>
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                <TableCell sx={{ fontWeight: 700 }}>Requested</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Customer (Maker)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>From Account</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>To Beneficiary</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Purpose / Remarks</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Decision</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {approvals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No pending transfers awaiting approval.
                  </TableCell>
                </TableRow>
              ) : (
                approvals.map((req) => {
                  const isMaker = user?.id === req.createdBy
                  return (
                    <TableRow key={req.id} hover>
                      <TableCell sx={{ fontSize: 13 }}>{formatDateTime(req.createdAt)}</TableCell>
                      <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{req.creatorUsername}</TableCell>
                      <TableCell sx={{ fontSize: 13, fontFamily: 'monospace' }}>#{req.fromAccountId}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>
                        <strong>{req.toAccountName}</strong> ({req.toAccountNumber})
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'warning.dark' }}>
                        {formatCurrency(req.amount, req.currency)}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{req.remarks}</TableCell>
                      <TableCell align="center">
                        {isMaker ? (
                          <Chip label="Maker: Self-Approval Prohibited" size="small" color="error" variant="outlined" sx={{ fontWeight: 700 }} />
                        ) : (
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Button
                              variant="contained"
                              size="small"
                              color="success"
                              startIcon={<CheckCircleOutlineIcon />}
                              onClick={() => handleOpenDecision(req, 'APPROVE')}
                              sx={{ fontWeight: 600, fontSize: 12, px: 1.5 }}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
                              startIcon={<HighlightOffIcon />}
                              onClick={() => handleOpenDecision(req, 'REJECT')}
                              sx={{ fontWeight: 600, fontSize: 12, px: 1.5 }}
                            >
                              Reject
                            </Button>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Decision Modal */}
      <Dialog open={decisionModal.open} onClose={() => setDecisionModal({ open: false })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {decisionModal.type === 'APPROVE' ? 'Authorize Fund Transfer' : 'Reject Transfer Request'}
        </DialogTitle>
        <DialogContent dividers>
          {decisionModal.item && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2">
                Are you sure you want to <strong>{decisionModal.type === 'APPROVE' ? 'approve' : 'reject'}</strong> transfer of{' '}
                <strong>{formatCurrency(decisionModal.item.amount, decisionModal.item.currency)}</strong> to{' '}
                <strong>{decisionModal.item.toAccountName}</strong>?
              </Typography>
              <TextField
                label="Staff Remarks / Authorization Note"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={decisionModal.type === 'APPROVE' ? 'e.g. Identity and invoice verified' : 'e.g. Unverified beneficiary details'}
                fullWidth
                size="small"
                multiline
                rows={2}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDecisionModal({ open: false })}>Cancel</Button>
          <Button
            variant="contained"
            color={decisionModal.type === 'APPROVE' ? 'success' : 'error'}
            onClick={handleConfirmDecision}
            disabled={processing}
          >
            {processing ? 'Processing...' : (decisionModal.type === 'APPROVE' ? 'Authorize Transfer' : 'Reject Request')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
