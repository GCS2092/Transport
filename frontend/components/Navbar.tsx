'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { useAuth } from '@/lib/auth'
import { LoginModal } from '@/components/LoginModal'

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

export function Navbar() {
  const pathname            = usePathname()
  const { t, lang, setLang } = useTranslation()
  const { user, logout }    = useAuth()

  const [lastCode,    setLastCode]    = useState<string | null>(null)
  const [time,        setTime]        = useState('')
  const [showLogin,   setShowLogin]   = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  /* Horloge */
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 10_000)
    return () => clearInterval(id)
  }, [lang])

  /* Dernier code */
  useEffect(() => {
    setLastCode(localStorage.getItem('vtc_last_code'))
    const handler = () => setLastCode(localStorage.getItem('vtc_last_code'))
    window.addEventListener('vtc_code_saved', handler)
    return () => window.removeEventListener('vtc_code_saved', handler)
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
        <div className="flex items-center justify-between px-4 h-12 max-w-2xl mx-auto gap-2">

          {/* Logo → retour landing */}
          <Link
            href="/"
            onClick={() => {
              localStorage.removeItem('vtc_visited')
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

          {/* Spacer */}
          <div className="flex-1" />

          {/* Dernier code de réservation (avant l'heure) */}
          {lastCode && (
            <Link
              href={`/suivi?code=${lastCode}`}
              className="flex items-center gap-1 bg-white/10 hover:bg-white/15 px-2.5 py-1 rounded-full transition-colors flex-shrink-0"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span className="text-white font-mono text-[11px] font-bold tracking-wide">{lastCode}</span>
            </Link>
          )}

          {/* Horloge */}
          {time && (
            <span className={`text-white/60 text-xs font-mono tabular-nums flex-shrink-0 ${lastCode ? 'hidden sm:inline' : ''}`}>{time}</span>
          )}

          {/* Toggle langue */}
          <button
            onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
            className="flex items-center gap-0.5 bg-white/10 hover:bg-white/20 px-2 py-1 rounded-full text-[11px] font-bold text-white transition-colors flex-shrink-0"
            aria-label="Changer de langue"
          >
            <span className={lang === 'fr' ? 'text-[var(--accent)]' : 'text-white/50'}>FR</span>
            <span className="text-white/30 mx-0.5">|</span>
            <span className={lang === 'en' ? 'text-[var(--accent)]' : 'text-white/50'}>EN</span>
          </button>

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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    {t.nav.signOut}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-full text-white text-[11px] font-semibold transition-colors flex-shrink-0"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              {t.nav.signIn}
            </button>
          )}
        </div>
      </header>

      {/* ── Bottom nav bar fixe (client uniquement) ─────────────────── */}
      {!pathname.startsWith('/chauffeur') && <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--primary)] border-t border-white/10">
        <div className="flex max-w-2xl mx-auto">
          {NAV_LINKS.map((link, i) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold tracking-wide transition-colors',
                  active ? 'text-[var(--accent)]' : 'text-white/50 hover:text-white/80'
                )}
              >
                <span className={cn('transition-transform', active && 'scale-110')}>
                  {NAV_ICONS[i]}
                </span>
                {link.label}
              </Link>
            )
          })}
        </div>
      </nav>}

      {/* ── Login modal ─────────────────────────────────────────────── */}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  )
}
