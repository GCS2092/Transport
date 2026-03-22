'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'

const NAV_ICONS = [
  /* Réserver */
  <svg key="r" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-4h10l2 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/>
    <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
  </svg>,
  /* Suivi */
  <svg key="s" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>,
  /* Tarifs */
  <svg key="t" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>,
  /* Contact */
  <svg key="c" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 2.1 6.18 2 2 0 0 1 4.11 4h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 11.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>,
]

const DRIVER_NAV = [
  {
    href: '/chauffeur',
    label: 'Courses',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-4h10l2 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/>
        <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
      </svg>
    ),
  },
  {
    href: '/chauffeur/historique',
    label: 'Historique',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    href: '/chauffeur/paiements',
    label: 'Paiements',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
  {
    href: '/chauffeur/profil',
    label: 'Profil',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
]

export function Navbar() {
  const pathname              = usePathname()
  const { t, lang, setLang } = useTranslation()
  const { user, logout }      = useAuth()

  const [lastCode,     setLastCode]     = useState<string | null>(null)
  const [time,         setTime]         = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)

  const isDriverRoute = pathname.startsWith('/chauffeur')
  const isAdminRoute  = pathname.startsWith('/admin')

  const promptNotifications = () => {
    try {
      if (!window.OneSignalDeferred) {
        alert('Notifications indisponibles (OneSignal non chargé).')
        return
      }
      window.OneSignalDeferred.push(async function (OneSignal) {
        try {
          if (OneSignal.Slidedown?.promptPush) await OneSignal.Slidedown.promptPush()
          else if (OneSignal.Notifications?.requestPermission) await OneSignal.Notifications.requestPermission()
          else alert("Impossible de demander l'autorisation (API OneSignal).")
        } catch {
          alert("Impossible d'activer les notifications sur ce navigateur.")
        }
      })
    } catch {
      alert("Impossible d'activer les notifications.")
    }
  }

  const safeGet = (key: string) => {
    try { return localStorage.getItem(key) } catch { return null }
  }

  const safeRemove = (key: string) => {
    try { localStorage.removeItem(key) } catch {}
  }

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 10_000)
    return () => clearInterval(id)
  }, [lang])

  useEffect(() => {
    setLastCode(safeGet('vtc_last_code'))
    const handler      = () => setLastCode(safeGet('vtc_last_code'))
    const clearHandler = () => setLastCode(null)
    window.addEventListener('vtc_code_saved',   handler)
    window.addEventListener('vtc_code_cleared', clearHandler)
    return () => {
      window.removeEventListener('vtc_code_saved',   handler)
      window.removeEventListener('vtc_code_cleared', clearHandler)
    }
  }, [])

  const NAV_LINKS = [
    { href: '/',             label: t.nav.reserve },
    { href: '/suivi',        label: t.nav.track   },
    { href: '/zones-tarifs', label: t.nav.prices  },
    { href: '/contact',      label: t.nav.contact },
  ]

  return (
    <>
      {/* ── Top header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[var(--primary)] shadow-sm">
        <div className="px-4 py-2 max-w-2xl mx-auto">
          <div className="flex items-center justify-between gap-2">

            {/* Logo */}
            <Link
              href="/"
              onClick={() => {
                safeRemove('vtc_visited')
                window.dispatchEvent(new Event('vtc_go_home'))
              }}
              className="flex items-center gap-1.5 flex-shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-4h10l2 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/>
                <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
              </svg>
              <span className="text-sm font-bold text-white tracking-tight">
                WEND'D <span className="text-[var(--accent)]">Transport</span>
              </span>
            </Link>

            <div className="flex-1" />

            {/* Auth */}
            {user ? (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-full transition-colors"
                >
                  <div className="w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-[9px] font-bold">
                    {user.firstName[0]}{user.lastName[0]}
                  </div>
                  <span className="text-white text-[11px] font-semibold max-w-[70px] truncate">{user.firstName}</span>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[160px] z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs font-bold text-gray-900 truncate">{user.firstName} {user.lastName}</p>
                      <p className="text-[10px] text-gray-400 uppercase">{user.role}</p>
                    </div>
                    <button
                      onClick={() => { logout(); setShowUserMenu(false) }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      {t.nav.signOut}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </header>
    </>
  )
}