import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Grid, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import SearchIcon from '@mui/icons-material/Search'
import { errorMessage, staffApi } from '../../services/api'
import type { CustomerStaffView } from '../../types'
import { formatDate } from '../../utils/format'

export default function StaffCustomersPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [customers, setCustomers] = useState<CustomerStaffView[]>([])
  const [search, setSearch] = useState('')

  // Register Modal
  const [openReg, setOpenReg] = useState(false)
  const [regUsername, setRegUsername] = useState('')
  const [regFullName, setRegFullName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regDeposit, setRegDeposit] = useState('50000')
  const [savingReg, setSavingReg] = useState(false)

  // Open Account Modal
  const [openAcc, setOpenAcc] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0)
  const [productName, setProductName] = useState('Standard Demo Savings')
  const [initialDeposit, setInitialDeposit] = useState('25000')
  const [savingAcc, setSavingAcc] = useState(false)

  const loadData = async (query = '') => {
    try {
      setLoading(true)
      const list = await staffApi.customers(query)
      setCustomers(list)
      if (list.length > 0) setSelectedCustomerId(list[0].userId)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadData(search)
  }

  const handleRegister = async () => {
    if (!regUsername || !regFullName || !regEmail) {
      setError('Username, Full Name, and Email are required.')
      return
    }
    try {
      setSavingReg(true)
      setError(null)
      const res = await staffApi.registerCustomer({
        username: regUsername.trim(),
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim() || '+91 98765 00000',
        initialDeposit: parseFloat(regDeposit) || 0,
      })
      setSuccessMsg(`Customer ${res.fullName} registered successfully in Core Banking Engine!`)
      setOpenReg(false)
      setRegUsername('')
      setRegFullName('')
      setRegEmail('')
      setRegPhone('')
      await loadData()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSavingReg(false)
    }
  }

  const handleOpenAccount = async () => {
    if (!selectedCustomerId) return
    try {
      setSavingAcc(true)
      setError(null)
      await staffApi.openAccount({
        customerUserId: selectedCustomerId,
        productName,
        initialDeposit: parseFloat(initialDeposit) || 0,
      })
      setSuccessMsg(`New ${productName} opened with initial deposit of ₹${Number(initialDeposit).toLocaleString()}!`)
      setOpenAcc(false)
      await loadData()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSavingAcc(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Customer Onboarding & Accounts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Register new banking customers and provision core savings accounts in Fineract
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ mt: { xs: 2, sm: 0 } }}>
          <Button
            variant="contained"
            startIcon={<HowToRegIcon />}
            onClick={() => { setError(null); setOpenReg(true) }}
            sx={{ fontWeight: 600 }}
          >
            Register Customer
          </Button>
          <Button
            variant="outlined"
            startIcon={<AccountBalanceIcon />}
            onClick={() => { setError(null); setOpenAcc(true) }}
            sx={{ fontWeight: 600 }}
          >
            Open New Account
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {successMsg && <Alert severity="success" onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {/* Search Bar */}
      <Paper component="form" onSubmit={handleSearch} sx={{ p: 2, borderRadius: 2 }}>
        <Stack direction="row" spacing={1.5}>
          <TextField
            placeholder="Search customers by name, username or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            fullWidth
          />
          <Button type="submit" variant="contained" startIcon={<SearchIcon />} sx={{ px: 3 }}>
            Search
          </Button>
        </Stack>
      </Paper>

      {/* Customers Table */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Registered Banking Customers ({customers.length})
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Client ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Customer Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Username</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Email Address</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Phone Number</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Linked Accounts</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Onboarded</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No customers found matching search criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((c) => (
                    <TableRow key={c.userId} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>CLI-{c.fineractClientId}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{c.fullName}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{c.username}</TableCell>
                      <TableCell>{c.email}</TableCell>
                      <TableCell>{c.phone}</TableCell>
                      <TableCell align="center">
                        <Chip label={`${c.accountsCount} active`} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
                      </TableCell>
                      <TableCell>
                        <Chip label={c.status} size="small" color={c.status === 'ACTIVE' ? 'success' : 'default'} sx={{ fontWeight: 600 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{formatDate(c.createdAt)}</TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<AccountBalanceIcon fontSize="small" />}
                          onClick={() => { setSelectedCustomerId(c.userId); setOpenAcc(true) }}
                          sx={{ fontWeight: 600, fontSize: 12 }}
                        >
                          + Account
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Register Customer Dialog */}
      <Dialog open={openReg} onClose={() => setOpenReg(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Register New Customer (KYC Onboarding)</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Full Name"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Rahul Verma"
                  fullWidth
                  size="small"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Username"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="e.g. rahul.verma"
                  fullWidth
                  size="small"
                  required
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email Address"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="e.g. rahul@example.com"
                  fullWidth
                  size="small"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Mobile Phone"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+91 98765 00000"
                  fullWidth
                  size="small"
                />
              </Grid>
            </Grid>

            <TextField
              label="Initial Demo Deposit Amount (INR)"
              type="number"
              value={regDeposit}
              onChange={(e) => setRegDeposit(e.target.value)}
              fullWidth
              size="small"
              helperText="Opens an initial Standard Savings account automatically"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenReg(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRegister} disabled={savingReg || !regUsername || !regFullName || !regEmail}>
            {savingReg ? 'Onboarding...' : 'Register Customer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Open Savings Account Dialog */}
      <Dialog open={openAcc} onClose={() => setOpenAcc(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Open New Savings Account</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              select
              label="Select Customer"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
              fullWidth
              size="small"
            >
              {customers.map((c) => (
                <MenuItem key={c.userId} value={c.userId}>
                  {c.fullName} ({c.username})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Savings Product"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="Standard Demo Savings">Standard Demo Savings (3.5% p.a.)</MenuItem>
              <MenuItem value="High-Yield Salary Reserve">High-Yield Salary Reserve (4.25% p.a.)</MenuItem>
              <MenuItem value="Corporate Current Account">Corporate Current Account (2.0% p.a.)</MenuItem>
            </TextField>

            <TextField
              label="Initial Deposit (INR)"
              type="number"
              value={initialDeposit}
              onChange={(e) => setInitialDeposit(e.target.value)}
              fullWidth
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenAcc(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleOpenAccount} disabled={savingAcc || !selectedCustomerId}>
            {savingAcc ? 'Opening...' : 'Open Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
