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

// ✅ Helper centralisé — utilisé partout
function linkOneSignal(user: AuthUser) {
  if (typeof window === 'undefined' || !window.OneSignalDeferred) return
  const email = user.email.trim().toLowerCase()
  const roleMap: Record<string, string> = { 'driver': 'chauffeur', 'admin': 'admin' }
  const role = roleMap[user.role?.toLowerCase()] || 'client'

  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      await OneSignal.login(email) // ✅ toujours l'email, jamais l'UUID
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

  // ✅ Au démarrage — restaure la session ET re-lie OneSignal
  useEffect(() => {
    try {
      const token = localStorage.getItem('vtc_token')
      const raw   = localStorage.getItem('vtc_user')
      if (token && raw) {
        const u = JSON.parse(raw) as AuthUser
        setUser(u)
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        linkOneSignal(u) // ✅ re-lien automatique au démarrage
      }
    } catch {}
    setLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const { data } = await api.post('/auth/login', { email, password })
    const { accessToken, refreshToken, user: u } = data
    setUser(u)
    localStorage.setItem('vtc_token', accessToken)
    localStorage.setItem('vtc_user', JSON.stringify(u))
    if (refreshToken) localStorage.setItem('vtc_refresh_token', refreshToken)
    if (u?.id) localStorage.setItem('vtc_user_id', u.id)
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    linkOneSignal(u) // ✅ re-lien immédiat après login
    return u
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('vtc_token')
    localStorage.removeItem('vtc_user')
    localStorage.removeItem('vtc_refresh_token')
    localStorage.removeItem('vtc_user_id')
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