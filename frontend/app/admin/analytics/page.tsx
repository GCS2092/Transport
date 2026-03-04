'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    topPickupZones: { name: string; count: number; revenue: number }[]
    topDropoffZones: { name: string; count: number; revenue: number }[]
    peakHours: { hour: number; count: number }[]
    hourlyDistribution: number[]
    weekdayStats: { day: string; count: number }[]
    statusDistribution: { total: number; completed: number; cancelled: number; pending: number; assigned: number; inProgress: number }
  } | null>(null)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const response = await adminApi.getAnalytics()
      setData(response.data)
    } catch (err) {
      console.error('Failed to load analytics', err)
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

  const maxHourly = Math.max(...data.hourlyDistribution)
  const maxWeekday = Math.max(...data.weekdayStats.map(d => d.count))

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Analyses avancées et tendances</p>
        </div>

        {/* Distribution par statut */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Distribution par statut</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <p className="text-xs text-emerald-700 uppercase font-semibold mb-1">Terminées</p>
              <p className="text-2xl font-bold text-emerald-700">{data.statusDistribution.completed}</p>
              <p className="text-xs text-emerald-600 mt-1">
                {((data.statusDistribution.completed / data.statusDistribution.total) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700 uppercase font-semibold mb-1">En cours</p>
              <p className="text-2xl font-bold text-blue-700">
                {data.statusDistribution.assigned + data.statusDistribution.inProgress}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {(((data.statusDistribution.assigned + data.statusDistribution.inProgress) / data.statusDistribution.total) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-red-700 uppercase font-semibold mb-1">Annulées</p>
              <p className="text-2xl font-bold text-red-700">{data.statusDistribution.cancelled}</p>
              <p className="text-xs text-red-600 mt-1">
                {((data.statusDistribution.cancelled / data.statusDistribution.total) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Zones populaires départ */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Top zones de départ</h2>
          <div className="space-y-2">
            {data.topPickupZones.map((zone, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </div>
                <span className="text-sm text-gray-900 flex-1 truncate">{zone.name}</span>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{zone.count} courses</p>
                  <p className="text-xs text-gray-500">{formatCurrency(zone.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Zones populaires arrivée */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Top zones d'arrivée</h2>
          <div className="space-y-2">
            {data.topDropoffZones.map((zone, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </div>
                <span className="text-sm text-gray-900 flex-1 truncate">{zone.name}</span>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{zone.count} courses</p>
                  <p className="text-xs text-gray-500">{formatCurrency(zone.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Heures de pointe */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Heures de pointe</h2>
          <div className="space-y-3 mb-4">
            {data.peakHours.map((peak, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </div>
                <span className="text-sm font-bold text-gray-900 w-16">{peak.hour}h - {peak.hour + 1}h</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${(peak.count / data.peakHours[0].count) * 100}%` }}
                  >
                    <span className="text-xs font-semibold text-white">{peak.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-xs font-semibold text-gray-700 mb-2">Distribution horaire (24h)</h3>
          <div className="flex items-end justify-between gap-0.5 h-24">
            {data.hourlyDistribution.map((count, hour) => {
              const height = maxHourly > 0 ? (count / maxHourly) * 100 : 0
              return (
                <div key={hour} className="flex-1 flex flex-col items-center justify-end group relative">
                  <div
                    className="w-full bg-amber-400 rounded-t transition-all hover:bg-amber-500"
                    style={{ height: `${height}%`, minHeight: count > 0 ? '2px' : '0' }}
                  />
                  {count > 0 && (
                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                      {hour}h: {count}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>0h</span>
            <span>6h</span>
            <span>12h</span>
            <span>18h</span>
            <span>24h</span>
          </div>
        </div>

        {/* Distribution par jour */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Distribution par jour de la semaine</h2>
          <div className="space-y-2">
            {data.weekdayStats.map((stat, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-sm text-gray-900 w-20">{stat.day}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${maxWeekday > 0 ? (stat.count / maxWeekday) * 100 : 0}%` }}
                  >
                    {stat.count > 0 && (
                      <span className="text-xs font-semibold text-white">{stat.count}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
