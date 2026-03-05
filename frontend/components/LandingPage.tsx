'use client'

import { useTranslation } from '@/lib/i18n'

interface Props { onEnter: () => void }

export function LandingPage({ onEnter }: Props) {
  const { lang } = useTranslation()
  const fr = lang === 'fr'

  return (
    <div
      className="min-h-[calc(100dvh-48px)] -mb-20 pb-20 flex flex-col overflow-hidden relative"
      style={{
        backgroundImage: 'url(/images/FOND.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Overlay sombre pour lisibilité du texte */}
      <div className="absolute inset-0 bg-black/65 pointer-events-none" />

      {/* Zone principale */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 pt-6 max-w-lg mx-auto w-full">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-8 self-start">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
          <span className="text-white/80 text-xs font-semibold tracking-wide">
            {fr ? 'Service disponible 24h/24' : 'Service available 24/7'}
          </span>
        </div>

        {/* Titre */}
        <h1 className="text-4xl font-extrabold text-white leading-tight mb-3">
          WEND&apos;D transport<br />
          <span className="text-[var(--accent)] text-2xl font-semibold">
            {fr ? 'le chemin sûr vers votre direction' : 'the safe way to your destination'}
          </span>
        </h1>

        <p className="text-white/70 text-sm leading-relaxed mb-10">
          {fr
            ? 'Tarifs fixes garantis, confirmation immédiate par email. Chauffeurs professionnels disponibles pour tous vos transferts.'
            : 'Fixed rates guaranteed, immediate email confirmation. Professional drivers available for all your transfers.'}
        </p>

        {/* Features */}
        <div className="space-y-3 mb-10">
          {[
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              ),
              label: fr ? 'Tarif fixe garanti' : 'Guaranteed fixed rate',
              sub:   fr ? 'Aucune surprise à l\'arrivée' : 'No surprise on arrival',
            },
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.91 9.6a19.86 19.86 0 0 1-3.07-8.67A2 2 0 0 1 3.83 1h3a2 2 0 0 1 2 1.72 12.05 12.05 0 0 0 .66 2.67 2 2 0 0 1-.45 2.11L8.09 8.91A16 16 0 0 0 16 16l1.41-1.41a2 2 0 0 1 2.11-.45 12.05 12.05 0 0 0 2.67.66A2 2 0 0 1 24 16.92z"/>
                </svg>
              ),
              label: fr ? 'Confirmation immédiate' : 'Immediate confirmation',
              sub:   fr ? 'Code VTC par email en secondes' : 'VTC code by email in seconds',
            },
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              ),
              label: fr ? 'Disponible 24h/24' : 'Available 24/7',
              sub:   fr ? 'AIBD et toutes les zones de Dakar' : 'AIBD and all Dakar zones',
            },
          ].map(f => (
            <div key={f.label} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[var(--accent)] flex-shrink-0 mt-0.5">
                {f.icon}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{f.label}</p>
                <p className="text-white/50 text-xs">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA fixé en bas */}
      <div className="relative z-10 px-6 pb-6 max-w-lg mx-auto w-full">
        <button
          onClick={onEnter}
          className="w-full py-4 rounded-2xl bg-[var(--accent)] text-white text-base font-bold tracking-wide shadow-lg hover:bg-[var(--accent-hover)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-4h10l2 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/>
            <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
          </svg>
          {fr ? 'Réserver un transfert' : 'Book a transfer'}
        </button>

        <p className="text-white/30 text-xs text-center mt-3">
          {fr ? 'Sans compte requis · Annulation gratuite 24h avant' : 'No account required · Free cancellation 24h before'}
        </p>
      </div>
    </div>
  )
}
