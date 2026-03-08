'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { driverApi, Reservation } from '@/lib/api'
import { formatDate } from '@/lib/utils'

const STATUS_RESA: Record<string, { label: string; color: string; bg: string }> = {
  EN_ATTENTE: { label: 'En attente', color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200'   },
  ASSIGNEE:   { label: 'Assignée',   color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200'     },
  EN_COURS:   { label: 'En cours',   color: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-200' },
  TERMINEE:   { label: 'Terminée',   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200'},
  ANNULEE:    { label: 'Annulée',    color: 'text-red-700',     bg: 'bg-red-50 border-red-200'       },
}

export default function DriverHistoryPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [rides, setRides] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all')

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'DRIVER') { router.replace('/'); return }
    
    driverApi.getMyRides().then(({ data }) => {
      setRides(data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [authLoading, user, router])

  // Filtrer les courses terminées
  const completedRides = rides.filter(r => r.status === 'TERMINEE')
  
  // Appliquer le filtre de paiement
  const filteredRides = completedRides.filter(r => {
    if (filter === 'paid') return r.paymentStatus === 'PAIEMENT_COMPLET'
    if (filter === 'unpaid') return r.paymentStatus !== 'PAIEMENT_COMPLET'
    return true
  }).sort((a, b) => new Date(b.pickupDateTime).getTime() - new Date(a.pickupDateTime).getTime())

  const totalRevenue = completedRides.reduce((sum, r) => sum + Number(r.amount), 0)
  const paidRevenue = completedRides
    .filter(r => r.paymentStatus === 'PAIEMENT_COMPLET')
    .reduce((sum, r) => sum + Number(r.amount), 0)

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="animate-spin text-[var(--primary)]" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle className="opacity-20" cx="12" cy="12" r="10"/><path d="M4 12a8 8 0 018-8"/>
        </svg>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-6">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Historique</h1>
      <p className="text-sm text-gray-500 mb-5">Vos courses terminées</p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900">{completedRides.length}</p>
            <p className="text-xs text-gray-400 font-medium">Courses</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900">{totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-gray-400 font-medium">FCFA total</p>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-4">
        {[
          ['all', 'Toutes'],
          ['paid', 'Payées'],
          ['unpaid', 'En attente'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key as typeof filter)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${filter === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Liste des courses */}
      {filteredRides.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <svg className="mx-auto mb-3 text-gray-300" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-4h10l2 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/>
            <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
          </svg>
          <p className="text-sm text-gray-400 font-medium">Aucune course dans cette catégorie</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRides.map(ride => {
            const st = STATUS_RESA[ride.status] || STATUS_RESA.EN_ATTENTE
            const isPaid = ride.paymentStatus === 'PAIEMENT_COMPLET'
            
            return (
              <Link key={ride.id} href={`/chauffeur/course/${ride.id}`}
                className="block bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-300 hover:shadow-sm transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-xs font-bold text-gray-400 font-mono">{ride.code}</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{ride.clientFirstName} {ride.clientLastName}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${st.bg} ${st.color} flex-shrink-0`}>
                      {st.label}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {isPaid ? 'Payée' : 'En attente'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
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
                      <polyline points="9 18 15 12 9 6"/>
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
