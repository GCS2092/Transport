'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { driverApi, reservationsApi, Reservation } from '@/lib/api'
import {
  getDriverPaymentsClearedAt,
  setDriverPaymentsClearedNow,
  clearDriverPaymentsPreference,
} from '@/lib/driver-local-prefs'

export default function DriverPaymentsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [rides, setRides] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)
  const [tab, setTab] = useState<'pending' | 'all'>('pending')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'DRIVER') {
      router.replace('/')
      return
    }

    driverApi
      .getMyRides()
      .then(pr => setRides(pr.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [authLoading, user, router])

  const paymentsClearedAt = getDriverPaymentsClearedAt()

  const terminated = useMemo(() => {
    let list = rides.filter(r => r.status === 'TERMINEE')
    if (paymentsClearedAt) {
      list = list.filter(r => new Date(r.pickupDateTime).getTime() > paymentsClearedAt.getTime())
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        r =>
          r.code.toLowerCase().includes(q) ||
          `${r.clientFirstName} ${r.clientLastName}`.toLowerCase().includes(q),
      )
    }
    return list.sort((a, b) => new Date(b.pickupDateTime).getTime() - new Date(a.pickupDateTime).getTime())
  }, [rides, paymentsClearedAt, searchQuery])

  const unpaidRides = terminated.filter(r => r.paymentStatus !== 'PAIEMENT_COMPLET')
  const displayed = tab === 'pending' ? unpaidRides : terminated
  const totalUnpaid = unpaidRides.reduce((sum, r) => sum + Number(r.amount), 0)

  const markAsPaid = async (rideId: string) => {
    setMarkingPaid(rideId)
    try {
      await reservationsApi.updatePaymentStatusByDriver(rideId, 'PAIEMENT_COMPLET')
      const { data } = await driverApi.getMyRides()
      setRides(data)
    } catch (e) {
      console.error('Erreur lors du marquage comme payé:', e)
    } finally {
      setMarkingPaid(null)
    }
  }

  const handleClearLocal = () => {
    if (
      !confirm(
        "Masquer les paiements affichés sur cet appareil ?\n\nLes données restent côté serveur. Pour un récap détaillé, attendez le rapport de fin de mois.",
      )
    )
      return
    setDriverPaymentsClearedNow()
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
      <h1 className="text-xl font-bold text-gray-900 mb-1">Paiements</h1>
      <p className="text-sm text-gray-500 mb-4">Courses terminées — statut de paiement</p>

      <div className="space-y-2 mb-4">
        <input
          type="search"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Filtrer par code ou client…"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
        <div className="flex flex-wrap gap-2 items-center text-xs">
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="text-gray-500 underline">
              Effacer
            </button>
          )}
          <button type="button" onClick={handleClearLocal} className="ml-auto font-semibold text-red-600">
            Vider l’affichage
          </button>
          {paymentsClearedAt && (
            <button type="button" onClick={() => clearDriverPaymentsPreference()} className="text-gray-500 underline">
              Réafficher tout
            </button>
          )}
        </div>
      </div>

      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-5">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${tab === 'pending' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
        >
          En attente ({unpaidRides.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${tab === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
        >
          Toutes terminées ({terminated.length})
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900">{unpaidRides.length}</p>
            <p className="text-xs text-gray-400 font-medium">En attente</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900">{totalUnpaid.toLocaleString()}</p>
            <p className="text-xs text-gray-400 font-medium">FCFA à percevoir</p>
          </div>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <p className="text-sm text-gray-900 font-semibold mb-1">
            {tab === 'pending' ? 'Tous les paiements sont à jour !' : 'Aucune course dans cette vue'}
          </p>
          <p className="text-xs text-gray-400">Ajuster la recherche ou l’onglet ci-dessus.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(ride => (
            <div key={ride.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="text-xs font-bold text-gray-400 font-mono">{ride.code}</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    {ride.clientFirstName} {ride.clientLastName}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Paiement : {ride.paymentStatus === 'PAIEMENT_COMPLET' ? 'Payé' : ride.paymentStatus}
                  </p>
                </div>
                <span className="text-lg font-bold text-emerald-600">{Number(ride.amount).toLocaleString()} FCFA</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {new Date(ride.pickupDateTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>

              {ride.paymentStatus !== 'PAIEMENT_COMPLET' && (
                <button
                  type="button"
                  onClick={() => markAsPaid(ride.id)}
                  disabled={markingPaid === ride.id}
                  className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {markingPaid === ride.id ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 12a8 8 0 018-8" />
                      </svg>
                      Traitement...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Marquer comme payé
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
