'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useTranslation } from '@/lib/i18n'

export default function LoginPage() {
  const { login, user, loading: authLoading } = useAuth()
  const { t } = useTranslation()
  const router = useRouter()
  const a = t.auth

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // Rediriger si déjà connecté
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'DRIVER') router.replace('/chauffeur')
      else if (user.role === 'ADMIN') router.replace('/admin')
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const u = await login(email, password)
      if (u.role === 'DRIVER') router.push('/chauffeur')
      else if (u.role === 'ADMIN') router.push('/admin')
      else router.push('/')
    } catch {
      setError(a.error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const inputCls = [
    'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white',
    'text-sm text-gray-900 placeholder:text-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent',
    'transition-colors',
  ].join(' ')

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[var(--primary)] flex items-center justify-center mb-3 shadow-lg">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-4h10l2 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/>
              <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[var(--ink)]">{a.title}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{a.subtitle}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[var(--border)] p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {a.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputCls}
                placeholder="admin@wendd-transport.com"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {a.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputCls}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[var(--primary)] text-white text-sm font-bold hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor"/>
                    <path className="opacity-75" d="M4 12a8 8 0 018-8" stroke="currentColor"/>
                  </svg>
                  {a.loading}
                </span>
              ) : a.submit}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--muted)] mt-6">
          WEND&apos;D Transport — Accès réservé au personnel
        </p>
      </div>
    </div>
  )
}
