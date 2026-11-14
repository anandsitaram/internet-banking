import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Paper, Stack, Tab, Tabs, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import ApprovalIcon from '@mui/icons-material/FactCheck'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import HighlightOffIcon from '@mui/icons-material/HighlightOff'
import HistoryIcon from '@mui/icons-material/History'
import { useAuth } from '../../contexts/AuthContext'
import { errorMessage, staffApi } from '../../services/api'
import type { PendingApprovalView } from '../../types'
import { formatCurrency, formatDateTime } from '../../utils/format'

export default function StaffApprovalsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [approvals, setApprovals] = useState<PendingApprovalView[]>([])

  // Modal
  const [modal, setModal] = useState<{ open: boolean; item?: PendingApprovalView; type?: 'APPROVE' | 'REJECT' }>({ open: false })
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const list = await staffApi.approvals()
      setApprovals(list)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDecision = async () => {
    if (!modal.item || !modal.type) return
    try {
      setSubmitting(true)
      setError(null)
      if (modal.type === 'APPROVE') {
        await staffApi.approve(modal.item.id, comment || 'Approved by Bank User')
        setSuccessMsg(`Transfer #${modal.item.id} approved and executed in core banking ledger.`)
      } else {
        await staffApi.reject(modal.item.id, comment || 'Rejected by Bank User')
        setSuccessMsg(`Transfer #${modal.item.id} rejected.`)
      }
      setModal({ open: false })
      await loadData()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const pendingList = approvals.filter((a) => a.status === 'PENDING_APPROVAL')
  const historyList = approvals.filter((a) => a.status !== 'PENDING_APPROVAL')

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          Maker-Checker Transfer Approvals
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Dual-control authorization: Review and authorize transfers exceeding the configured limit threshold
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {successMsg && <Alert severity="success" onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      <Paper sx={{ borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab icon={<ApprovalIcon />} iconPosition="start" label={`Pending Queue (${pendingList.length})`} sx={{ fontWeight: 600 }} />
          <Tab icon={<HistoryIcon />} iconPosition="start" label={`Decided History (${historyList.length})`} sx={{ fontWeight: 600 }} />
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : tab === 0 ? (
          <TableContainer sx={{ p: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Requested</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Customer (Maker)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>From Account</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>To Beneficiary</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Purpose / Remarks</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No transfers pending maker-checker authorization.
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingList.map((req) => {
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
                                onClick={() => { setModal({ open: true, item: req, type: 'APPROVE' }); setComment('') }}
                                sx={{ fontWeight: 600, fontSize: 12 }}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                color="error"
                                startIcon={<HighlightOffIcon />}
                                onClick={() => { setModal({ open: true, item: req, type: 'REJECT' }); setComment('') }}
                                sx={{ fontWeight: 600, fontSize: 12 }}
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
        ) : (
          <TableContainer sx={{ p: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Decided</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Maker</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Recipient</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Outcome</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No resolved approval records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  historyList.map((h) => (
                    <TableRow key={h.id} hover>
                      <TableCell sx={{ fontSize: 13 }}>{formatDateTime(h.updatedAt)}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{h.creatorUsername}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{h.toAccountName}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(h.amount, h.currency)}</TableCell>
                      <TableCell sx={{ fontSize: 13, fontFamily: 'monospace' }}>{h.fineractTransferRef || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={h.status}
                          size="small"
                          color={h.status === 'COMPLETED' ? 'success' : 'error'}
                          sx={{ fontWeight: 700, fontSize: 11 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Decision Dialog */}
      <Dialog open={modal.open} onClose={() => setModal({ open: false })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {modal.type === 'APPROVE' ? 'Authorize Fund Transfer' : 'Reject Transfer Request'}
        </DialogTitle>
        <DialogContent dividers>
          {modal.item && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2">
                Authorize transfer of <strong>{formatCurrency(modal.item.amount, modal.item.currency)}</strong> to{' '}
                <strong>{modal.item.toAccountName}</strong>?
              </Typography>
              <TextField
                label="Authorization Comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional review notes"
                fullWidth
                size="small"
                multiline
                rows={2}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setModal({ open: false })}>Cancel</Button>
          <Button
            variant="contained"
            color={modal.type === 'APPROVE' ? 'success' : 'error'}
            onClick={handleDecision}
            disabled={submitting}
          >
            {submitting ? 'Executing...' : (modal.type === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
