'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { driverApi, Driver, Reservation } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function DriverStatsPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    driver: Driver
    stats: {
      totalRides: number
      completedRides: number
      cancelledRides: number
      totalRevenue: number
      todayRides: number
      todayRevenue: number
      monthRides: number
      monthRevenue: number
      averageRideValue: number
      completionRate: number
    }
    recentRides: Reservation[]
  } | null>(null)

  useEffect(() => {
    loadStats()
  }, [params.id])

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await driverApi.getStats(params.id as string)
      setData(response.data)
    } catch (err) {
      console.error('Failed to load driver stats', err)
      alert('Erreur lors du chargement des statistiques')
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

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Aucune donnée disponible</p>
      </div>
    )
  }

  const { driver, stats, recentRides } = data

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
              {driver.firstName[0]}{driver.lastName[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {driver.firstName} {driver.lastName}
              </h1>
              <p className="text-sm text-gray-500">{driver.vehicleType} • {driver.vehiclePlate}</p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total courses</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalRides}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.completedRides} terminées</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Revenu total</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
            <p className="text-xs text-gray-500 mt-1">Moy. {formatCurrency(stats.averageRideValue)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Aujourd'hui</p>
            <p className="text-2xl font-bold text-gray-900">{stats.todayRides}</p>
            <p className="text-xs text-emerald-600 mt-1">{formatCurrency(stats.todayRevenue)}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Ce mois</p>
            <p className="text-2xl font-bold text-gray-900">{stats.monthRides}</p>
            <p className="text-xs text-emerald-600 mt-1">{formatCurrency(stats.monthRevenue)}</p>
          </div>
        </div>

        {/* Taux de complétion */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 uppercase font-semibold">Taux de complétion</p>
            <p className="text-lg font-bold text-gray-900">{stats.completionRate.toFixed(1)}%</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>

        {/* Courses récentes */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Courses récentes</h2>
          
          {recentRides.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Aucune course</p>
          ) : (
            <div className="space-y-3">
              {recentRides.map(ride => (
                <div key={ride.id} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono font-semibold text-gray-900">{ride.code}</p>
                      <p className="text-xs text-gray-600 truncate">
                        {ride.pickupZone?.name} → {ride.dropoffZone?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(ride.amount)}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(ride.pickupDateTime), 'dd MMM', { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      ride.status === 'TERMINEE' ? 'bg-emerald-100 text-emerald-800' :
                      ride.status === 'ANNULEE' ? 'bg-red-100 text-red-800' :
                      ride.status === 'EN_COURS' ? 'bg-purple-100 text-purple-800' :
                      ride.status === 'ASSIGNEE' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {ride.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
