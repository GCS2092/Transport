'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'

export interface AuthUser {
  id: string
  email: string
  role: 'ADMIN' | 'DRIVER'
  firstName: string
  lastName: string
}

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void | Promise<void>>
  }
}

interface AuthCtx {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => void
}

const AuthContext = createContext<AuthCtx | null>(null)

// ✅ Cookie helpers — fallback Safari/Edge qui bloquent localStorage
function setAuthCookies(token: string, user: AuthUser) {
  if (typeof document === 'undefined') return
  const maxAge = 'max-age=2592000' // 30 jours
  document.cookie = `vtc_token=${encodeURIComponent(token)}; path=/; ${maxAge}; SameSite=Lax`
  document.cookie = `vtc_user=${encodeURIComponent(JSON.stringify(user))}; path=/; ${maxAge}; SameSite=Lax`
}

function clearAuthCookies() {
  if (typeof document === 'undefined') return
  document.cookie = 'vtc_token=; path=/; max-age=0'
  document.cookie = 'vtc_user=; path=/; max-age=0'
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

function getStoredToken(): string | null {
  try { return localStorage.getItem('vtc_token') } catch {}
  return getCookie('vtc_token')
}

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('vtc_user')
    if (raw) return JSON.parse(raw) as AuthUser
  } catch {}
  try {
    const raw = getCookie('vtc_user')
    if (raw) return JSON.parse(raw) as AuthUser
  } catch {}
  return null
}

// ✅ Helper centralisé OneSignal — toujours email, jamais UUID
function linkOneSignal(user: AuthUser) {
  if (typeof window === 'undefined' || !window.OneSignalDeferred) return
  const email = user.email.trim().toLowerCase()
  const roleMap: Record<string, string> = { 'driver': 'chauffeur', 'admin': 'admin' }
  const role = roleMap[user.role?.toLowerCase()] || 'client'

  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      await OneSignal.login(email)
      OneSignal.User.addTags({ role })
      console.log('[OneSignal] linked:', email, 'role:', role)
    } catch (e) {
      if (!String(e).includes('409')) {
        console.warn('[OneSignal] link error', e)
      }
    }
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // ✅ Au démarrage — restaure session depuis localStorage OU cookie (Safari)
  useEffect(() => {
    try {
      const token = getStoredToken()
      const u = getStoredUser()
      if (token && u) {
        setUser(u)
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        linkOneSignal(u)
      }
    } catch {}
    setLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const { data } = await api.post('/auth/login', { email, password })
    const { accessToken, refreshToken, user: u } = data
    setUser(u)

    // ✅ Sauvegarde localStorage + cookie (fallback Safari)
    try {
      localStorage.setItem('vtc_token', accessToken)
      localStorage.setItem('vtc_user', JSON.stringify(u))
      if (refreshToken) localStorage.setItem('vtc_refresh_token', refreshToken)
      if (u?.id) localStorage.setItem('vtc_user_id', u.id)
    } catch {}

    setAuthCookies(accessToken, u)
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    linkOneSignal(u)
    return u
  }

  const logout = () => {
    setUser(null)

    // ✅ Nettoie localStorage + cookies
    try {
      localStorage.removeItem('vtc_token')
      localStorage.removeItem('vtc_user')
      localStorage.removeItem('vtc_refresh_token')
      localStorage.removeItem('vtc_user_id')
    } catch {}

    clearAuthCookies()
    delete api.defaults.headers.common['Authorization']

    if (typeof window !== 'undefined' && window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async function (OneSignal) {
        try {
          if (typeof OneSignal.logout === 'function') await OneSignal.logout()
          OneSignal.User.addTags({ role: 'client' })
        } catch {}
      })
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}