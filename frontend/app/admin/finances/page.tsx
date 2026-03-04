'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

export default function AdminFinances() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    dailyRevenue: { date: string; revenue: number }[]
    monthlyRevenue: { month: string; revenue: number }[]
    topDrivers: { name: string; revenue: number }[]
    paymentStats: { completed: number; pending: number; totalCompleted: number; totalPending: number }
    totalRevenue: number
    totalRides: number
    averageRideValue: number
  } | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await adminApi.getFinancialStats()
      setData(response.data)
    } catch (err) {
      console.error('Failed to load financial stats', err)
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

  const maxMonthlyRevenue = Math.max(...data.monthlyRevenue.map(m => m.revenue))
  const maxDailyRevenue = Math.max(...data.dailyRevenue.map(d => d.revenue))

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Finances</h1>
          <p className="text-sm text-gray-500 mt-1">Statistiques financières détaillées</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Revenu total</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.totalRevenue)}</p>
            <p className="text-xs text-gray-500 mt-1">{data.totalRides} courses</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Valeur moyenne</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.averageRideValue)}</p>
            <p className="text-xs text-gray-500 mt-1">par course</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">En attente</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(data.paymentStats.totalPending)}</p>
            <p className="text-xs text-gray-500 mt-1">{data.paymentStats.pending} paiements</p>
          </div>
        </div>

        {/* Revenus mensuels */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Revenus mensuels (12 derniers mois)</h2>
          <div className="space-y-2">
            {data.monthlyRevenue.map(item => (
              <div key={item.month} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-16">{item.month}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full flex items-center justify-end pr-2 transition-all"
                    style={{ width: `${maxMonthlyRevenue > 0 ? (item.revenue / maxMonthlyRevenue) * 100 : 0}%` }}
                  >
                    {item.revenue > 0 && (
                      <span className="text-xs font-semibold text-white">
                        {formatCurrency(item.revenue)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenus quotidiens (30 derniers jours) */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Revenus quotidiens (30 derniers jours)</h2>
          <div className="flex items-end justify-between gap-1 h-32">
            {data.dailyRevenue.map((item, idx) => {
              const height = maxDailyRevenue > 0 ? (item.revenue / maxDailyRevenue) * 100 : 0
              return (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end group relative">
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                    style={{ height: `${height}%`, minHeight: item.revenue > 0 ? '4px' : '0' }}
                  />
                  {item.revenue > 0 && (
                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                      {formatCurrency(item.revenue)}
                      <div className="text-[10px] text-gray-300">{item.date}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Top chauffeurs */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Top 10 chauffeurs par revenu</h2>
          <div className="space-y-3">
            {data.topDrivers.map((driver, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </div>
                <span className="text-sm text-gray-900 flex-1 truncate">{driver.name}</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(driver.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Statut des paiements */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Statut des paiements</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <p className="text-xs text-emerald-700 uppercase font-semibold mb-1">Payés</p>
              <p className="text-2xl font-bold text-emerald-700">{data.paymentStats.completed}</p>
              <p className="text-sm text-emerald-600 mt-1">{formatCurrency(data.paymentStats.totalCompleted)}</p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <p className="text-xs text-amber-700 uppercase font-semibold mb-1">En attente</p>
              <p className="text-2xl font-bold text-amber-700">{data.paymentStats.pending}</p>
              <p className="text-sm text-amber-600 mt-1">{formatCurrency(data.paymentStats.totalPending)}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
