import { useState, type ReactNode } from 'react'
import {
  AppBar, Alert, Avatar, Box, Button, Divider, Drawer, IconButton, List,
  ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Toolbar, Tooltip,
  Typography, useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import MenuIcon from '@mui/icons-material/Menu'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import PersonIcon from '@mui/icons-material/Person'
import BadgeIcon from '@mui/icons-material/Badge'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ChangePasswordDialog from '../features/auth/ChangePasswordDialog'

export interface NavItem { label: string; to: string; icon: ReactNode; end?: boolean }
const DRAWER = 250

export default function PortalLayout({ title, nav }: { title: string; nav: NavItem[] }) {
  const { user, logout, login } = useAuth()
  const navigate = useNavigate()
  const theme = useTheme()
  const desktop = useMediaQuery(theme.breakpoints.up('md'))
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [roleAnchor, setRoleAnchor] = useState<HTMLElement | null>(null)
  const [pwdOpen, setPwdOpen] = useState(false)

  const handleQuickSwitchRole = async (targetUser: string, targetPath: string) => {
    setRoleAnchor(null)
    try {
      await login(targetUser, 'DemoPass@2026')
      navigate(targetPath)
    } catch {
      // fallback
      navigate(targetPath)
    }
  }

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: '#0b2046', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ gap: 1.2, py: 1 }}>
        <AccountBalanceIcon sx={{ color: '#00e676', fontSize: 32 }} />
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.1, letterSpacing: -0.2 }}>OpenBank</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{title}</Typography>
        </Box>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255,255,255,.14)' }} />
      <List sx={{ px: 1, py: 1.5, flex: 1 }}>
        {nav.map((n) => (
          <ListItemButton key={n.to} component={NavLink} to={n.to} end={n.end} onClick={() => setOpen(false)}
            sx={{
              borderRadius: 1.5,
              color: 'rgba(255,255,255,0.85)',
              mb: 0.5,
              '&.active': {
                bgcolor: 'rgba(0, 230, 118, 0.15)',
                color: '#00e676',
                fontWeight: 700,
                '& .MuiListItemIcon-root': { color: '#00e676' },
              },
              '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
            }}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{n.icon}</ListItemIcon>
            <ListItemText primary={n.label} primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }} />
          </ListItemButton>
        ))}
      </List>

      <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', fontSize: 10 }}>
          CORE BANKING ENGINE
        </Typography>
        <Typography variant="caption" sx={{ color: '#00e676', fontWeight: 600, display: 'block' }}>
          Apache Fineract 1.12
        </Typography>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      <AppBar position="fixed" color="inherit"
        sx={{ ml: { md: `${DRAWER}px` }, width: { md: `calc(100% - ${DRAWER}px)` }, borderBottom: '1px solid #e2e8f0', bgcolor: '#ffffff', boxShadow: 'none' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {!desktop && (
              <IconButton edge="start" onClick={() => setOpen(true)} aria-label="Open navigation" sx={{ mr: 1 }}><MenuIcon /></IconButton>
            )}
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {title}
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1.5}>
            {/* Quick Role Switcher for Demo & Vercel */}
            <Tooltip title="Switch demo user role instantly">
              <Button
                variant="outlined"
                size="small"
                startIcon={<SwapHorizIcon />}
                onClick={(e) => setRoleAnchor(e.currentTarget)}
                sx={{
                  borderColor: '#0066cc',
                  fontWeight: 600,
                  fontSize: 12,
                  py: 0.5,
                  textTransform: 'none',
                }}
              >
                Switch Role ({user?.roles[0] || 'DEMO'})
              </Button>
            </Tooltip>

            <Menu anchorEl={roleAnchor} open={!!roleAnchor} onClose={() => setRoleAnchor(null)}>
              <MenuItem onClick={() => handleQuickSwitchRole('customer.alex', '/customer')}>
                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="Banking Customer" secondary="customer.alex" />
              </MenuItem>
              <MenuItem onClick={() => handleQuickSwitchRole('bank.user1', '/staff')}>
                <ListItemIcon><BadgeIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="Bank User / Operations" secondary="bank.user1" />
              </MenuItem>
              <MenuItem onClick={() => handleQuickSwitchRole('admin', '/admin')}>
                <ListItemIcon><AdminPanelSettingsIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="Administrator" secondary="admin" />
              </MenuItem>
            </Menu>

            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{user?.fullName}</Typography>
              <Typography variant="caption" color="text.secondary">{user?.roles[0]}</Typography>
            </Box>

            <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="Account menu">
              <Avatar sx={{ bgcolor: '#0b2046', width: 34, height: 34, fontSize: 14, fontWeight: 700 }}>
                {user?.fullName?.charAt(0) || 'U'}
              </Avatar>
            </IconButton>

            <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
              <MenuItem onClick={() => { setAnchor(null); setPwdOpen(true) }}>Change password</MenuItem>
              <MenuItem onClick={() => { setAnchor(null); void logout() }}>Sign out</MenuItem>
            </Menu>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER }, flexShrink: { md: 0 } }}>
        <Drawer variant={desktop ? 'permanent' : 'temporary'} open={desktop || open} onClose={() => setOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER, border: 0 } }}>
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 3.5 } }}>
        <Toolbar />
        <Alert
          severity="info"
          variant="outlined"
          sx={{ mb: 3, bgcolor: '#ffffff', borderColor: '#b8d5f5', color: '#0d3b66', borderRadius: 2 }}
        >
          <strong>Demo Sandbox:</strong> Double-entry core banking simulation powered by Apache Fineract & Spring Boot. All balances, accounts, and payments are virtual.
        </Alert>
        <Outlet />
      </Box>
      <ChangePasswordDialog open={pwdOpen} onClose={() => setPwdOpen(false)} />
    </Box>
  )
}
