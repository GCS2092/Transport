'use client'

import { useState, useEffect } from 'react'
import { zonesApi, tariffsApi, Zone } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

export default function ZonesTarifsPage() {
  const { t } = useTranslation()
  const z = t.zones
  const [zones, setZones] = useState<Zone[]>([])
  const [selectedFrom, setSelectedFrom] = useState<string>('')
  const [selectedTo, setSelectedTo] = useState<string>('')
  const [price, setPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadZones()
  }, [])

  useEffect(() => {
    if (selectedFrom && selectedTo && selectedFrom !== selectedTo) {
      fetchPrice()
    } else {
      setPrice(null)
    }
  }, [selectedFrom, selectedTo])

  const loadZones = async () => {
    try {
      const { data } = await zonesApi.getActive()
      setZones(data)
    } catch (error) {
      console.error('Erreur chargement zones:', error)
    }
  }

  const fetchPrice = async () => {
    setLoading(true)
    try {
      const { data } = await tariffsApi.getPrice(selectedFrom, selectedTo)
      setPrice(data.price)
    } catch (error) {
      setPrice(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-10">
      <div className="max-w-lg mx-auto px-4 pt-6">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--ink)]">{z.title}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{z.subtitle}</p>
        </div>

        <div className="bg-white rounded-2xl border border-[var(--border)] p-5 mb-4">
          <h2 className="text-base font-bold text-[var(--ink)] mb-4">{z.calculate}</h2>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--ink2)]">{z.from}</label>
              <select
                value={selectedFrom}
                onChange={e => setSelectedFrom(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <option value="">{z.select}</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>

            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold">↓</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--ink2)]">{z.to}</label>
              <select
                value={selectedTo}
                onChange={e => setSelectedTo(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <option value="">{z.select}</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
          </div>

          {selectedFrom && selectedTo && selectedFrom === selectedTo && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
              {z.different}
            </div>
          )}

          {loading && (
            <p className="mt-3 text-center text-sm text-[var(--muted)]">{z.calculating}</p>
          )}

          {price !== null && !loading && selectedFrom !== selectedTo && (
            <div className="mt-3 bg-[var(--primary)] rounded-xl p-4 text-white">
              <p className="text-xs text-white/60 uppercase tracking-wide">{z.fixedRate}</p>
              <p className="text-white/80 text-sm mt-0.5">
                {zones.find(zn => zn.id === selectedFrom)?.name} → {zones.find(zn => zn.id === selectedTo)?.name}
              </p>
              <p className="text-2xl font-bold text-[var(--accent)] mt-2">{formatCurrency(price)}</p>
            </div>
          )}

          {price !== null && (
            <a
              href={`/?from=${selectedFrom}&to=${selectedTo}`}
              className="block mt-3 w-full py-3 bg-[var(--accent)] text-white rounded-xl text-sm font-bold text-center hover:bg-[var(--accent-hover)] transition-all"
            >
              {z.bookTrip}
            </a>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {z.advantages.map(card => (
            <div key={card.title} className="bg-white rounded-xl border border-[var(--border)] p-4 text-center">
              <p className="text-xs font-bold text-[var(--ink)]">{card.title}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{card.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-base font-bold text-[var(--ink)]">{z.zonesTitle}</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">{zones.length} zones disponibles 24h/24</p>
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
          </div>
        </div>

      </div>
    </div>
  )
}
