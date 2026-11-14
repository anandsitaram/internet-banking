import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Grid, IconButton, Paper, Stack,
  TextField, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import SendIcon from '@mui/icons-material/Send'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import { beneficiariesApi, errorMessage } from '../../services/api'
import type { BeneficiaryView } from '../../types'
import { formatDate } from '../../utils/format'
import { useNavigate } from 'react-router-dom'

export default function CustomerBeneficiariesPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryView[]>([])

  // Add Modal
  const [openAdd, setOpenAdd] = useState(false)
  const [name, setName] = useState('')
  const [accRef, setAccRef] = useState('')
  const [bank, setBank] = useState('State Core Bank')
  const [nickname, setNickname] = useState('')
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const list = await beneficiariesApi.list()
      setBeneficiaries(list)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAdd = async () => {
    if (!name || !accRef) {
      setError('Beneficiary Name and Account Reference are required.')
      return
    }
    try {
      setSaving(true)
      setError(null)
      await beneficiariesApi.add({
        beneficiaryName: name,
        accountReference: accRef,
        bankName: bank,
        nickname: nickname || name,
      })
      setOpenAdd(false)
      setName('')
      setAccRef('')
      setNickname('')
      await loadData()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this beneficiary?')) return
    try {
      await beneficiariesApi.remove(id)
      await loadData()
    } catch (err) {
      setError(errorMessage(err))
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
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Beneficiaries Directory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your verified payment recipients for instant fund transfers
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setError(null); setOpenAdd(true) }}
          sx={{ fontWeight: 600 }}
        >
          Add Beneficiary
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={2}>
        {beneficiaries.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
              <AccountBalanceIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" fontWeight={600} gutterBottom>
                No beneficiaries added yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Add your friends, vendors, or family to make rapid money transfers.
              </Typography>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpenAdd(true)}>
                Add First Beneficiary
              </Button>
            </Paper>
          </Grid>
        ) : (
          beneficiaries.map((b) => (
            <Grid item xs={12} sm={6} md={4} key={b.id}>
              <Card sx={{ borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: 2.5, flexGrow: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {b.beneficiaryName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {b.nickname ? `Nick: ${b.nickname}` : 'Recipient'}
                      </Typography>
                    </Box>
                    <Tooltip title="Delete beneficiary">
                      <IconButton size="small" color="error" onClick={() => handleDelete(b.id)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Account Reference
                    </Typography>
                    <Typography variant="body2" fontWeight={700} fontFamily="monospace">
                      {b.accountReference}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }} display="block">
                      Bank: {b.bankName}
                    </Typography>
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                    Added: {formatDate(b.createdAt)}
                  </Typography>

                  <Divider sx={{ my: 1.5 }} />

                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    startIcon={<SendIcon />}
                    onClick={() => navigate('/customer/transfers')}
                    sx={{ fontWeight: 600 }}
                  >
                    Transfer to {b.nickname || b.beneficiaryName.split(' ')[0]}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {/* Add Beneficiary Dialog */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add New Beneficiary</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Beneficiary Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              fullWidth
              size="small"
              required
            />
            <TextField
              label="Account Number / Reference"
              value={accRef}
              onChange={(e) => setAccRef(e.target.value)}
              placeholder="e.g. ACC-10003"
              fullWidth
              size="small"
              required
            />
            <TextField
              label="Bank Name"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder="e.g. State Core Bank"
              fullWidth
              size="small"
            />
            <TextField
              label="Nickname / Label"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Personal Account"
              fullWidth
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={saving || !name || !accRef}>
            {saving ? 'Saving...' : 'Add Beneficiary'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
