import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { UNAUTHORIZED_EVENT, authApi } from '../services/api'
import type { AuthUser } from '../types'

type Status = 'loading' | 'authenticated' | 'anonymous'
interface AuthCtx {
  user: AuthUser | null
  status: Status
  sessionExpired: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasPermission: (code: string) => boolean
}

const Ctx = createContext<AuthCtx | null>(null)
const REFRESH_EVERY_MS = 5 * 60 * 1000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [sessionExpired, setSessionExpired] = useState(false)
  const lastActivity = useRef(Date.now())
  const lastRefresh = useRef(Date.now())

  // Restore the signed-in user from the bearer token kept for this browser tab.
  useEffect(() => {
    authApi.me()
      .then((s) => { setUser(s.user); setStatus('authenticated') })
      .catch(() => setStatus('anonymous'))
  }, [])

  // Any 401 from a protected call means the session ended.
  useEffect(() => {
    const onUnauthorized = () => {
      setUser((u) => { if (u) setSessionExpired(true); return null })
      setStatus('anonymous')
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  // Renew the short-lived token only while the person is actually active.
  useEffect(() => {
    if (status !== 'authenticated') return
    const mark = () => { lastActivity.current = Date.now() }
    const events = ['mousemove', 'keydown', 'click', 'touchstart'] as const
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }))
    const timer = window.setInterval(() => {
      const now = Date.now()
      if (now - lastActivity.current < REFRESH_EVERY_MS && now - lastRefresh.current >= REFRESH_EVERY_MS) {
        lastRefresh.current = now
        authApi.refresh().then((s) => setUser(s.user)).catch(() => { /* 401 handled by interceptor */ })
      }
    }, 60_000)
    return () => {
      events.forEach((e) => window.removeEventListener(e, mark))
      window.clearInterval(timer)
    }
  }, [status])

  const login = useCallback(async (username: string, password: string) => {
    const s = await authApi.login(username, password)
    lastActivity.current = lastRefresh.current = Date.now()
    setSessionExpired(false)
    setUser(s.user)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try { await authApi.logout() } finally {
      setUser(null); setSessionExpired(false); setStatus('anonymous')
    }
  }, [])

  const value = useMemo<AuthCtx>(() => ({
    user, status, sessionExpired, login, logout,
    hasPermission: (code) => !!user?.permissions.includes(code),
  }), [user, status, sessionExpired, login, logout])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside AuthProvider')
  return v
}

export function homePathFor(user: AuthUser | null): string {
  if (!user) return '/login'
  if (user.roles.includes('ADMIN')) return '/admin'
  if (user.roles.includes('BANK_USER')) return '/staff'
  if (user.roles.includes('CUSTOMER')) return '/customer'
  return '/login'
}
