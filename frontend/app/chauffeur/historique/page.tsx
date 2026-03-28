'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { driverApi, Reservation } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import {
  getDriverHistoryClearedAt,
  setDriverHistoryClearedNow,
  clearDriverHistoryPreference,
} from '@/lib/driver-local-prefs'

const STATUS_RESA: Record<string, { label: string; color: string; bg: string }> = {
  EN_ATTENTE: { label: 'En attente', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  ASSIGNEE: { label: 'Assignée', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  EN_COURS: { label: 'En cours', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  TERMINEE: { label: 'Terminée', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  ANNULEE: { label: 'Annulée', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
}

export default function DriverHistoryPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [rides, setRides] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [period, setPeriod] = useState<'all' | '30' | '90'>('all')

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'DRIVER') {
      router.replace('/')
      return
    }

    driverApi
      .getMyRides()
      .then(({ data }) => setRides(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [authLoading, user, router])

  const clearedAt = getDriverHistoryClearedAt()

  const completedRides = useMemo(() => {
    let list = rides.filter(r => r.status === 'TERMINEE')
    if (clearedAt) {
      list = list.filter(r => new Date(r.pickupDateTime).getTime() > clearedAt.getTime())
    }
    if (period !== 'all') {
      const days = period === '30' ? 30 : 90
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
      list = list.filter(r => new Date(r.pickupDateTime).getTime() >= cutoff)
    }
    if (filter === 'paid') list = list.filter(r => r.paymentStatus === 'PAIEMENT_COMPLET')
    if (filter === 'unpaid') list = list.filter(r => r.paymentStatus !== 'PAIEMENT_COMPLET')
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        r =>
          r.code.toLowerCase().includes(q) ||
          `${r.clientFirstName} ${r.clientLastName}`.toLowerCase().includes(q),
      )
    }
    return list.sort((a, b) => new Date(b.pickupDateTime).getTime() - new Date(a.pickupDateTime).getTime())
  }, [rides, clearedAt, period, filter, searchQuery])

  const allCompletedForStats = rides.filter(r => r.status === 'TERMINEE')
  const totalRevenue = allCompletedForStats.reduce((sum, r) => sum + Number(r.amount), 0)
  const paidRevenue = allCompletedForStats
    .filter(r => r.paymentStatus === 'PAIEMENT_COMPLET')
    .reduce((sum, r) => sum + Number(r.amount), 0)

  const handleClearLocalHistory = () => {
    if (
      !confirm(
        "Vider l’affichage de votre historique sur cet appareil ?\n\nLes courses restent en base ; l’admin peut les archiver.\nAprès cette action, seules les nouvelles courses apparaîtront ici jusqu’au rapport de fin de mois pour un récap complet.",
      )
    )
      return
    setDriverHistoryClearedNow()
    setRides([...rides])
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="animate-spin text-[var(--primary)]" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle className="opacity-20" cx="12" cy="12" r="10" />
          <path d="M4 12a8 8 0 018-8" />
        </svg>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-6">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Historique</h1>
      <p className="text-sm text-gray-500 mb-4">Vos courses terminées</p>

      <div className="flex flex-col gap-2 mb-4">
        <input
          type="search"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Rechercher par code ou client…"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as typeof period)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white"
          >
            <option value="all">Toute période</option>
            <option value="30">30 derniers jours</option>
            <option value="90">90 derniers jours</option>
          </select>
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="text-xs text-gray-500 underline">
              Effacer recherche
            </button>
          )}
          <button
            type="button"
            onClick={handleClearLocalHistory}
            className="ml-auto text-xs font-semibold text-red-600 hover:text-red-800"
          >
            Vider l’affichage
          </button>
          {clearedAt && (
            <button type="button" onClick={() => clearDriverHistoryPreference()} className="text-xs text-gray-500 underline">
              Réafficher tout
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900">{allCompletedForStats.length}</p>
            <p className="text-xs text-gray-400 font-medium">Courses (total compte)</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900">{paidRevenue.toLocaleString()}</p>
            <p className="text-xs text-gray-400 font-medium">FCFA encaissés (payés)</p>
          </div>
        </div>
      </div>

      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-4">
        {(['all', 'paid', 'unpaid'] as const).map(key => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              filter === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {key === 'all' ? 'Toutes' : key === 'paid' ? 'Payées' : 'En attente'}
          </button>
        ))}
      </div>

      {completedRides.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <p className="text-sm text-gray-400 font-medium">Aucune course dans cette sélection</p>
        </div>
      ) : (
        <div className="space-y-3">
          {completedRides.map(ride => {
            const st = STATUS_RESA[ride.status] || STATUS_RESA.EN_ATTENTE
            const isPaid = ride.paymentStatus === 'PAIEMENT_COMPLET'

            return (
              <Link
                key={ride.id}
                href={`/chauffeur/course/${ride.id}`}
                className="block bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-300 hover:shadow-sm transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-xs font-bold text-gray-400 font-mono">{ride.code}</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">
                      {ride.clientFirstName} {ride.clientLastName}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${st.bg} ${st.color} flex-shrink-0`}>
                      {st.label}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {isPaid ? 'Payée' : 'En attente'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {formatDate(ride.pickupDateTime)}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <span className="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {ride.pickupZone?.name}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <span className="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      {ride.dropoffZone?.name}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">{Number(ride.amount).toLocaleString()} FCFA</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
