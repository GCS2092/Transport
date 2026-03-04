'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { reservationsApi, Reservation } from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/utils'

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  EN_ATTENTE: { label: 'En attente', color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200'    },
  ASSIGNEE:   { label: 'Assignée',   color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200'      },
  EN_COURS:   { label: 'En cours',   color: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-200'  },
  TERMINEE:   { label: 'Terminée',   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200'},
  ANNULEE:    { label: 'Annulée',    color: 'text-red-700',     bg: 'bg-red-50 border-red-200'        },
}

const TRIP_LABELS: Record<string, string> = {
  ALLER_SIMPLE:  'Aller simple',
  RETOUR_SIMPLE: 'Retour simple',
  ALLER_RETOUR:  'Aller-retour',
}

export default function RideDetail() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [ride,    setRide]    = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting,  setActing]  = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'DRIVER') { router.replace('/'); return }
    reservationsApi.getById(id)
      .then(r => setRide(r.data))
      .catch(() => setError('Course introuvable.'))
      .finally(() => setLoading(false))
  }, [authLoading, user, id, router])

  const updateStatus = async (status: 'EN_COURS' | 'TERMINEE') => {
    if (!ride || acting) return
    setActing(true)
    setError('')
    try {
      const { data } = await reservationsApi.updateStatus(ride.id, status)
      setRide(data)
    } catch {
      setError('Impossible de mettre à jour le statut.')
    } finally { setActing(false) }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="animate-spin text-[var(--primary)]" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle className="opacity-20" cx="12" cy="12" r="10"/><path d="M4 12a8 8 0 018-8"/>
        </svg>
      </div>
    )
  }

  if (error && !ride) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button onClick={() => router.back()} className="text-[var(--primary)] text-sm font-semibold">← Retour</button>
      </div>
    )
  }

  if (!ride) return null

  const st = STATUS_CFG[ride.status] || STATUS_CFG.EN_ATTENTE

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-8 space-y-4">

      {/* ── Header back + code ────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-base font-extrabold text-gray-900 font-mono">{ride.code}</h1>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${st.bg} ${st.color}`}>
            {st.label}
          </span>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold text-[var(--primary)]">{formatCurrency(ride.amount)}</p>
          <p className="text-[10px] text-gray-400">{TRIP_LABELS[ride.tripType] || ride.tripType}</p>
        </div>
      </div>

      {/* ── Trajet ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Trajet</p>
        <div className="flex items-stretch gap-3">
          <div className="flex flex-col items-center gap-1 pt-1">
            <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="flex-1 w-px bg-gray-200" />
            <span className="w-3 h-3 rounded-full bg-red-400 flex-shrink-0" />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-xs text-gray-400">Départ</p>
              <p className="text-sm font-bold text-gray-900">{ride.pickupZone?.name}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {formatDate(ride.pickupDateTime)}
              </p>
            </div>
            <div className="h-px bg-gray-100" />
            <div>
              <p className="text-xs text-gray-400">Destination</p>
              <p className="text-sm font-bold text-gray-900">{ride.dropoffZone?.name}</p>
              {ride.returnDateTime && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Retour : {formatDate(ride.returnDateTime)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Client ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Client</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">{ride.clientFirstName} {ride.clientLastName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{ride.clientEmail}</p>
          </div>
          <a href={`tel:${ride.clientPhone}`}
            className="flex items-center gap-1.5 bg-[var(--primary)] text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-[var(--primary-hover)] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 2.1 6.18 2 2 0 0 1 4.11 4h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.09a16 16 0 0 0 6 6"/>
            </svg>
            {ride.clientPhone}
          </a>
        </div>
      </div>

      {/* ── Infos complémentaires ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Détails</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Passagers</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5 flex items-center gap-1">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              {ride.passengers}
            </p>
          </div>
          {ride.flightNumber && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Vol</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{ride.flightNumber}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Paiement</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{ride.paymentStatus}</p>
          </div>
        </div>
        {ride.notes && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Notes</p>
            <p className="text-sm text-gray-700">{ride.notes}</p>
          </div>
        )}
      </div>

      {/* ── Erreur action ─────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────── */}
      {ride.status === 'ASSIGNEE' && (
        <button
          onClick={() => updateStatus('EN_COURS')}
          disabled={acting}
          className="w-full py-4 rounded-2xl bg-[var(--primary)] text-white font-bold text-base hover:bg-[var(--primary-hover)] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {acting ? (
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12a8 8 0 018-8"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          )}
          Démarrer la course
        </button>
      )}

      {ride.status === 'EN_COURS' && (
        <button
          onClick={() => updateStatus('TERMINEE')}
          disabled={acting}
          className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-base hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {acting ? (
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12a8 8 0 018-8"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          )}
          Terminer la course
        </button>
      )}

      {(ride.status === 'TERMINEE' || ride.status === 'ANNULEE') && (
        <div className={`w-full py-3.5 rounded-2xl text-center text-sm font-bold ${
          ride.status === 'TERMINEE'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-gray-100 text-gray-400 border border-gray-200'
        }`}>
          {ride.status === 'TERMINEE' ? 'Course terminée' : 'Course annulée'}
        </div>
      )}
    </div>
  )
}
