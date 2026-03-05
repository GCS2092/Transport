'use client'

import { useState, useEffect } from 'react'
import { zonesApi, Zone } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import Link from 'next/link'

const FIXED_PRICES = [
  {
    type: 'ALLER_SIMPLE',
    label: 'Aller simple',
    labelEn: 'One way',
    price: 25000,
    icon: '🚗',
    description: 'Trajet unique vers votre destination',
    descriptionEn: 'Single trip to your destination',
  },
  {
    type: 'RETOUR_SIMPLE',
    label: 'Retour simple',
    labelEn: 'Return only',
    price: 25000,
    icon: '🔙',
    description: 'Trajet retour depuis votre destination',
    descriptionEn: 'Return trip from your destination',
  },
  {
    type: 'ALLER_RETOUR',
    label: 'Aller-retour',
    labelEn: 'Round trip',
    price: 30000,
    icon: '🔄',
    description: 'Trajet aller + retour inclus',
    descriptionEn: 'Both ways included',
  },
]

export default function ZonesTarifsPage() {
  const { t, lang } = useTranslation()
  const z = t.zones
  const [zones, setZones] = useState<Zone[]>([])

  useEffect(() => {
    zonesApi.getActive()
      .then(r => setZones(r.data))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-10">
      <div className="max-w-lg mx-auto px-4 pt-6">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--ink)]">{z.title}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{z.subtitle}</p>
        </div>

        {/* Tarifs fixes */}
        <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--primary)]">
            <h2 className="text-base font-bold text-white">💰 {lang === 'fr' ? 'Nos tarifs' : 'Our prices'}</h2>
            <p className="text-xs text-white/70 mt-0.5">
              {lang === 'fr' ? 'Prix fixes garantis — même tarif pour toute destination' : 'Fixed guaranteed prices — same rate for every destination'}
            </p>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {FIXED_PRICES.map(item => (
              <div key={item.type} className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center text-xl flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-[var(--ink)]">
                    {lang === 'fr' ? item.label : item.labelEn}
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {lang === 'fr' ? item.description : item.descriptionEn}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-[var(--accent)]">{formatCurrency(item.price)}</p>
                  <p className="text-xs text-[var(--muted)]">{lang === 'fr' ? 'Tarif fixe' : 'Fixed rate'}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 bg-emerald-50 border-t border-emerald-100">
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 text-sm">✓</span>
              <p className="text-xs text-emerald-700">
                {lang === 'fr'
                  ? 'Prix identiques pour toutes les destinations — zones prédéfinies ou adresses personnalisées'
                  : 'Same price for all destinations — predefined zones or custom addresses'}
              </p>
            </div>
          </div>
        </div>

        {/* Bouton réserver */}
        <Link
          href="/"
          className="block w-full py-3.5 bg-[var(--accent)] text-white rounded-2xl text-sm font-bold text-center hover:bg-[var(--accent-hover)] transition-all mb-6"
        >
          {z.bookTrip}
        </Link>

        {/* Avantages */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {z.advantages.map(card => (
            <div key={card.title} className="bg-white rounded-xl border border-[var(--border)] p-4 text-center">
              <p className="text-xs font-bold text-[var(--ink)]">{card.title}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Zones desservies */}
        <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-base font-bold text-[var(--ink)]">{z.zonesTitle}</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {zones.length} {lang === 'fr' ? 'zones disponibles 24h/24' : 'zones available 24/7'}
            </p>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {zones.map((zone, i) => (
              <div key={zone.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-8 h-8 rounded-full bg-[var(--accent-light)] text-[var(--accent-hover)] flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--ink)] truncate">{zone.name}</p>
                  {zone.description && <p className="text-xs text-[var(--muted)] truncate mt-0.5">{zone.description}</p>}
                </div>
                <span className="text-xs text-[var(--accent)] font-semibold flex-shrink-0">{z.active}</span>
              </div>
            ))}
            {zones.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-[var(--muted)]">
                {lang === 'fr' ? 'Chargement des zones...' : 'Loading zones...'}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
