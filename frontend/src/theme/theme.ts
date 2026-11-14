import { createTheme } from '@mui/material/styles'

// Ledger green on warm paper; amber is reserved for the "demo funds" notice.
export const theme = createTheme({
  palette: {
    primary: { main: '#14532d' },
    secondary: { main: '#8a5a00' },
    background: { default: '#f4f5f1', paper: '#ffffff' },
    text: { primary: '#1b2420', secondary: '#4b5a52' },
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
    h4: { fontWeight: 650, letterSpacing: '-0.01em' },
    h5: { fontWeight: 650 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: '1px solid #dde2da' } } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 600, background: '#eef1ea' } } },
  },
})
