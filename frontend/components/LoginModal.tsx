'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useTranslation } from '@/lib/i18n'

interface Props { onClose: () => void }

export function LoginModal({ onClose }: Props) {
  const { login } = useAuth()
  const { t } = useTranslation()
  const router = useRouter()
  const a = t.auth

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const u = await login(email, password)
      onClose()
      if (u.role === 'DRIVER') router.push('/chauffeur')
    } catch {
      setError(a.error)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = [
    'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white',
    'text-sm text-gray-900 placeholder:text-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent',
    'transition-colors',
  ].join(' ')

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={a.close}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-4h10l2 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/>
              <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{a.title}</p>
            <p className="text-xs text-gray-400">{a.subtitle}</p>
          </div>
        </div>

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
              placeholder="admin@vtcdakar.com"
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
    </div>
  )
}
