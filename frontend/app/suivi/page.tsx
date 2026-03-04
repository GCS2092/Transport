'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { reservationsApi, Reservation } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  EN_ATTENTE: { color: '#A16207', bg: '#FEF9C3' },
  ASSIGNEE:   { color: '#1D4ED8', bg: '#DBEAFE' },
  EN_COURS:   { color: '#C2410C', bg: '#FFEDD5' },
  TERMINEE:   { color: '#15803D', bg: '#DCFCE7' },
  ANNULEE:    { color: '#DC2626', bg: '#FEE2E2' },
}

const STATUS_ORDER = ['EN_ATTENTE', 'ASSIGNEE', 'EN_COURS', 'TERMINEE']

function SuiviContent() {
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const tr = t.track
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [loading, setLoading] = useState(false)
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [error, setError] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [cancelToken, setCancelToken] = useState('')

  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    EN_ATTENTE: { label: 'En attente', ...STATUS_COLORS.EN_ATTENTE },
    ASSIGNEE:   { label: 'Assignée',   ...STATUS_COLORS.ASSIGNEE },
    EN_COURS:   { label: 'En cours',   ...STATUS_COLORS.EN_COURS },
    TERMINEE:   { label: 'Terminée',   ...STATUS_COLORS.TERMINEE },
    ANNULEE:    { label: 'Annulée',    ...STATUS_COLORS.ANNULEE },
  }

  useEffect(() => {
    const c = searchParams.get('code')
    if (c) { setCode(c); doSearch(c) }
  }, [])

  const doSearch = async (c: string) => {
    if (!c.trim()) return
    setLoading(true)
    setError('')
    setReservation(null)
    try {
      const { data } = await reservationsApi.getByCode(c.trim())
      setReservation(data)
    } catch (err: any) {
      setError(err.response?.data?.message || tr.notFound)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    doSearch(code)
  }

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault()
    setCancelLoading(true)
    try {
      await reservationsApi.cancel(code, cancelToken)
      await doSearch(code)
      setShowCancelForm(false)
      setCancelToken('')
    } catch (err: any) {
      alert(err.response?.data?.message || "Erreur lors de l'annulation")
    } finally {
      setCancelLoading(false)
    }
  }

  const statusConf = reservation ? (STATUS_CONFIG[reservation.status] || STATUS_CONFIG.EN_ATTENTE) : null
  const currentStepIdx = reservation ? STATUS_ORDER.indexOf(reservation.status) : -1

  return (
    <div className="min-h-[calc(100dvh-7rem)] bg-[var(--bg)] pb-10">
      <div className="max-w-lg mx-auto px-4 pt-6">

        <div className="mb-5">
          <h1 className="text-2xl font-bold text-[var(--ink)]">{tr.title}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{tr.subtitle}</p>
        </div>

        {/* Barre de recherche */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-5">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder={tr.placeholder}
            className="flex-1 px-4 py-3 rounded-xl border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 bg-[var(--primary)] text-white rounded-xl text-sm font-bold hover:bg-[var(--primary-hover)] transition-all disabled:opacity-60"
          >
            {loading ? tr.searching : tr.search}
          </button>
        </form>

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex gap-2">
            <svg className="flex-shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Résultat */}
        {reservation && statusConf && (
          <div className="space-y-3">

            {/* Header carte */}
            <div className="bg-[var(--primary)] rounded-2xl p-5 text-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-wide mb-1">{tr.bookingCode}</p>
                  <p className="text-2xl font-mono font-bold">{reservation.code}</p>
                </div>
                <span
                  className="text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{ background: statusConf.bg, color: statusConf.color }}
                >
                  {statusConf.label}
                </span>
              </div>

              {/* Timeline */}
              {reservation.status !== 'ANNULEE' && (
                <div className="flex items-center">
                  {STATUS_ORDER.map((s, i) => (
                    <div key={s} className="flex items-center flex-1">
                      <div className="flex flex-col items-center" style={{ minWidth: 0 }}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          i < currentStepIdx ? 'bg-[var(--accent)] text-white' :
                          i === currentStepIdx ? 'bg-white text-[var(--primary)]' :
                          'bg-white/20 text-white/40'
                        }`}>
                          {i < currentStepIdx ? '✓' : i + 1}
                        </div>
                        <span className="text-white/60 text-xs mt-1 text-center" style={{ fontSize: '10px' }}>
                          {STATUS_CONFIG[s].label}
                        </span>
                      </div>
                      {i < STATUS_ORDER.length - 1 && (
                        <div className={`flex-1 h-0.5 mb-4 mx-0.5 ${
                          i < currentStepIdx ? 'bg-[var(--accent)]' : 'bg-white/20'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trajet */}
            <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
              <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">{tr.trip}</p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs text-[var(--muted)]">{tr.departure}</p>
                  <p className="font-bold text-[var(--ink)]">{reservation.pickupZone.name}</p>
                </div>
                <div className="text-[var(--accent)] font-bold text-xl">→</div>
                <div className="flex-1 text-right">
                  <p className="text-xs text-[var(--muted)]">{tr.arrival}</p>
                  <p className="font-bold text-[var(--ink)]">{reservation.dropoffZone.name}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[var(--border)] flex justify-between items-center">
                <span className="text-sm text-[var(--muted)]">{tr.fixedRate}</span>
                <span className="text-xl font-bold text-[var(--accent)]">{formatCurrency(reservation.amount)}</span>
              </div>
            </div>

            {/* Détails */}
            <div className="bg-white rounded-2xl border border-[var(--border)] divide-y divide-[var(--border)]">
              {[
                { label: tr.dateTime, value: new Date(reservation.pickupDateTime).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) },
                { label: tr.passengers, value: `${reservation.passengers}` },
                { label: tr.type, value: reservation.tripType.replace('_', ' ') },
                { label: tr.payment, value: reservation.paymentStatus === 'PAIEMENT_COMPLET' ? tr.paid : tr.pending },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center px-5 py-3">
                  <span className="text-xs text-[var(--muted)] font-medium">{row.label}</span>
                  <span className="text-sm font-semibold text-[var(--ink)]">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Chauffeur assigné */}
            {reservation.driver && (
              <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
                <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">{tr.driver}</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {reservation.driver.firstName[0]}{reservation.driver.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[var(--ink)] truncate">{reservation.driver.firstName} {reservation.driver.lastName}</p>
                    <p className="text-sm text-[var(--muted)] truncate">{reservation.driver.vehicleType} · {reservation.driver.vehiclePlate}</p>
                  </div>
                  <a
                    href={`tel:${reservation.driver.phone || ''}`}
                    className="px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-xs font-bold flex-shrink-0"
                  >
                    {tr.call}
                  </a>
                </div>
              </div>
            )}

            {/* Notes */}
            {reservation.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">{tr.notes}</p>
                <p className="text-sm text-amber-800">{reservation.notes}</p>
              </div>
            )}

            {/* Annulation */}
            {reservation.status !== 'ANNULEE' && reservation.status !== 'TERMINEE' && (
              <div>
                {!showCancelForm ? (
                  <button
                    onClick={() => setShowCancelForm(true)}
                    className="w-full py-3.5 rounded-xl border-2 border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-all"
                  >
                    {tr.cancel}
                  </button>
                ) : (
                  <form onSubmit={handleCancel} className="bg-white rounded-2xl border-2 border-red-200 p-5 space-y-3">
                    <p className="text-sm font-bold text-red-600">{tr.confirmCancel}</p>
                    <p className="text-xs text-[var(--muted)] mb-2">{tr.cancelToken}</p>
                    <input
                      type="text"
                      value={cancelToken}
                      onChange={e => setCancelToken(e.target.value)}
                      placeholder={tr.cancelTokenHint}
                      className="w-full px-4 py-3 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                      required
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowCancelForm(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--ink2)]">
                        {tr.back}
                      </button>
                      <button
                        type="submit"
                        disabled={cancelLoading} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-60"
                      >
                        {cancelLoading ? '...' : tr.confirm}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}

export default function SuiviPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[var(--muted)]">Chargement...</p>
        </div>
      </div>
    }>
      <SuiviContent />
    </Suspense>
  )
}
