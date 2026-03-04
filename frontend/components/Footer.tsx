import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-[var(--primary)] text-white">
      <div className="max-w-lg mx-auto px-4 py-5 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-4h10l2 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/>
            <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
          </svg>
          <span className="font-bold text-sm">VTC Dakar</span>
          <span className="text-white/30">·</span>
          <span className="text-white/50 text-xs">2026</span>
        </div>
        <div className="flex gap-5">
          <Link href="/mentions-legales" className="text-white/50 hover:text-white/80 text-xs transition-colors">
            Mentions légales
          </Link>
          <Link href="/cgv" className="text-white/50 hover:text-white/80 text-xs transition-colors">
            CGV
          </Link>
          <Link href="/confidentialite" className="text-white/50 hover:text-white/80 text-xs transition-colors">
            Confidentialité
          </Link>
        </div>
      </div>
    </footer>
  )
}
