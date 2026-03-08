'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { driverApi, reservationsApi, Reservation } from '@/lib/api'

export default function DriverPaymentsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [rides, setRides] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'DRIVER') { router.replace('/'); return }
    
    driverApi.getMyRides().then(({ data }) => {
      setRides(data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [authLoading, user, router])

  const unpaidRides = rides.filter(r => r.status === 'TERMINEE' && r.paymentStatus !== 'PAIEMENT_COMPLET')
  const totalUnpaid = unpaidRides.reduce((sum, r) => sum + Number(r.amount), 0)

  const markAsPaid = async (rideId: string) => {
    setMarkingPaid(rideId)
    try {
      await reservationsApi.updatePaymentStatus(rideId, 'PAIEMENT_COMPLET')
      const { data } = await driverApi.getMyRides()
      setRides(data)
    } catch (e) {
      console.error('Erreur lors du marquage comme payé:', e)
    } finally {
      setMarkingPaid(null)
    }
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-6">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Paiements</h1>
      <p className="text-sm text-gray-500 mb-5">Gérez vos paiements en attente</p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
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
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900">{totalUnpaid.toLocaleString()}</p>
            <p className="text-xs text-gray-400 font-medium">FCFA à percevoir</p>
          </div>
        </div>
      </div>

      {/* Liste des paiements en attente */}
      {unpaidRides.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <svg className="mx-auto mb-3 text-emerald-400" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <p className="text-sm text-gray-900 font-semibold mb-1">Tous les paiements sont à jour !</p>
          <p className="text-xs text-gray-400">Vous n&apos;avez aucun paiement en attente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {unpaidRides.map(ride => (
            <div key={ride.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="text-xs font-bold text-gray-400 font-mono">{ride.code}</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{ride.clientFirstName} {ride.clientLastName}</p>
                </div>
                <span className="text-lg font-bold text-emerald-600">{Number(ride.amount).toLocaleString()} FCFA</span>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {new Date(ride.pickupDateTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>

              <button
                onClick={() => markAsPaid(ride.id)}
                disabled={markingPaid === ride.id}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {markingPaid === ride.id ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 12a8 8 0 018-8"/>
                    </svg>
                    Traitement...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Marquer comme payé
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
