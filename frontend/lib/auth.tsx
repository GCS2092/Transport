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

interface AuthCtx {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => void
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const token = localStorage.getItem('vtc_token')
      const raw   = localStorage.getItem('vtc_user')
      if (token && raw) {
        setUser(JSON.parse(raw))
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      }
    } catch {}
    setLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const { data } = await api.post('/auth/login', { email, password })
    const { accessToken, refreshToken, user: u } = data
    setUser(u)
    localStorage.setItem('vtc_token', accessToken)
    localStorage.setItem('vtc_user',  JSON.stringify(u))
    if (refreshToken) localStorage.setItem('vtc_refresh_token', refreshToken)
    if (u?.id)        localStorage.setItem('vtc_user_id', u.id)
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    return u
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('vtc_token')
    localStorage.removeItem('vtc_user')
    localStorage.removeItem('vtc_refresh_token')
    localStorage.removeItem('vtc_user_id')
    delete api.defaults.headers.common['Authorization']
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
