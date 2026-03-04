'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { adminApi, Reservation } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    client: { email: string; firstName: string; lastName: string; phone: string } | null
    stats: { totalRides: number; completedRides: number; cancelledRides: number; totalSpent: number }
    reservations: Reservation[]
  } | null>(null)

  useEffect(() => {
    loadHistory()
  }, [params.email])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const response = await adminApi.getClientHistory(decodeURIComponent(params.email as string))
      setData(response.data)
    } catch (err) {
      console.error('Failed to load client history', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]" />
      </div>
    )
  }

  if (!data || !data.client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Aucune donnée disponible</p>
      </div>
    )
  }

  const { client, stats, reservations } = data

  const statusColors: Record<string, string> = {
    EN_ATTENTE: 'bg-amber-100 text-amber-800',
    ASSIGNEE: 'bg-blue-100 text-blue-800',
    EN_COURS: 'bg-purple-100 text-purple-800',
    TERMINEE: 'bg-emerald-100 text-emerald-800',
    ANNULEE: 'bg-red-100 text-red-800',
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-4xl mx-auto px-4 pt-6">
        
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Retour
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-2xl">
              {client.firstName[0]}{client.lastName[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {client.firstName} {client.lastName}
              </h1>
              <p className="text-sm text-gray-500">{client.email}</p>
              <p className="text-sm text-gray-500">{client.phone}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total courses</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalRides}</p>
            <p className="text-xs text-emerald-600 mt-1">
              {stats.completedRides} terminées • {stats.cancelledRides} annulées
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total dépensé</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalSpent)}</p>
            <p className="text-xs text-gray-500 mt-1">
              Moy. {formatCurrency(stats.completedRides > 0 ? stats.totalSpent / stats.completedRides : 0)}
            </p>
          </div>
        </div>

        {/* Historique */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Historique des courses</h2>
          
          {reservations.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Aucune course</p>
          ) : (
            <div className="space-y-3">
              {reservations.map(res => (
                <div key={res.id} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-mono font-semibold text-gray-900">{res.code}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[res.status]}`}>
                          {res.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">
                        {res.pickupZone?.name} → {res.dropoffZone?.name}
                      </p>
                      {res.driver && (
                        <p className="text-xs text-gray-500">
                          Chauffeur: {res.driver.firstName} {res.driver.lastName}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(res.amount)}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(res.pickupDateTime), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>
                  {res.notes && (
                    <p className="text-xs text-gray-500 italic">Note: {res.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
