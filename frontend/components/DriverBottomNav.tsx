'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
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

export function DriverBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--primary)] border-t border-white/10">
      <div className="flex max-w-2xl mx-auto">
        {TABS.map(tab => {
          const active = tab.href === '/chauffeur'
            ? pathname === '/chauffeur'
            : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold tracking-wide transition-colors',
                active ? 'text-[var(--accent)]' : 'text-white/50 hover:text-white/80'
              )}
            >
              <span className={cn('transition-transform', active && 'scale-110')}>
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
