'use client'

import { useEffect, useState } from 'react'
import { adminApi, AdminStats } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

const IconTrendingUp = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
)

const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const IconCar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-4h10l2 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/>
    <circle cx="7" cy="17" r="2"/>
    <circle cx="17" cy="17" r="2"/>
  </svg>
)

const IconDollar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
)

const IconAlertCircle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportPassword, setReportPassword] = useState('')
  const [reportError, setReportError] = useState('')
  const [sendingReport, setSendingReport] = useState(false)
  const [reportSuccess, setReportSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const { data } = await adminApi.getStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to load stats', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sendingReport) return
    setSendingReport(true)
    setReportError('')
    try {
      const { data } = await adminApi.sendReportsNow(reportPassword)
      setReportSuccess(
        `Rapports envoyés : ${data.driversNotified} chauffeur(s), ${data.adminsNotified} admin(s) — période : ${data.period}`
      )
      setShowReportModal(false)
      setReportPassword('')
    } catch (err: any) {
      // NestJS peut renvoyer message comme string ou tableau (class-validator)
      const raw = err.response?.data?.message
      const msg =
        typeof raw === 'string'
          ? raw
          : Array.isArray(raw)
          ? raw.join(', ')
          : "Erreur lors de l'envoi"
      setReportError(msg)
    } finally {
      setSendingReport(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500">Impossible de charger les statistiques</p>
          <button onClick={loadStats} className="mt-4 px-4 py-2 bg-[var(--primary)] text-white rounded-lg">
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    EN_ATTENTE: '#f59e0b',
    ASSIGNEE: '#3b82f6',
    EN_COURS: '#8b5cf6',
    TERMINEE: '#10b981',
    ANNULEE: '#ef4444',
  }

  const statusLabels: Record<string, string> = {
    EN_ATTENTE: 'En attente',
    ASSIGNEE: 'Assignée',
    EN_COURS: 'En cours',
    TERMINEE: 'Terminée',
    ANNULEE: 'Annulée',
  }

  const totalReservations = Object.values(stats.byStatus).reduce((sum, count) => sum + count, 0)

  return (
    <div className="bg-gray-50 pb-6">
      <div className="max-w-6xl mx-auto px-4 pt-6">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
            <p className="text-sm text-gray-500 mt-1">Vue d'ensemble de l'activité</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="/admin/map"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-semibold"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Carte des chauffeurs
            </a>
            <button
              onClick={() => { setShowReportModal(true); setReportError(''); setReportSuccess(null) }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-semibold"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 14a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 3.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10a16 16 0 0 0 6 6z"/>
              </svg>
              Envoyer résumé maintenant
            </button>
          </div>
        </div>

        {/* Bandeau succès envoi rapport */}
        {reportSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-emerald-600 font-bold text-lg">✓</span>
            <p className="text-sm text-emerald-800 font-medium">{reportSuccess}</p>
          </div>
        )}

        {/* Alertes emails en échec */}
        {stats.alerts.failedEmails > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <IconAlertCircle />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">
                {stats.alerts.failedEmails} email{stats.alerts.failedEmails > 1 ? 's' : ''} en échec
              </p>
              <p className="text-xs text-red-700 mt-0.5">Consultez les logs pour plus de détails</p>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <IconDollar />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase font-semibold">Revenus totaux</p>
                <p className="text-xl font-bold text-gray-900 truncate">{formatCurrency(stats.revenue.total)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Ce mois : <span className="font-semibold text-emerald-600">{formatCurrency(stats.revenue.thisMonth)}</span>
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <IconCar />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase font-semibold">Courses</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Ce mois : <span className="font-semibold text-blue-600">{stats.thisMonth}</span>
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <IconUsers />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase font-semibold">Chauffeurs</p>
                <p className="text-xl font-bold text-gray-900">{stats.drivers.actifs}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Disponibles : <span className="font-semibold text-purple-600">{stats.drivers.DISPONIBLE}</span>
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <IconTrendingUp />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase font-semibold">En cours</p>
                <p className="text-xl font-bold text-gray-900">{stats.drivers.EN_COURSE}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Chauffeurs actifs
            </p>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">

          {/* Répartition des courses */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-base font-bold text-gray-900 mb-4">Répartition des courses</h2>
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                  {Object.entries(stats.byStatus).map(([status, count], idx, arr) => {
                    const total = arr.reduce((sum, [, c]) => sum + c, 0)
                    const percentage = (count / total) * 100
                    const prevPercentages = arr.slice(0, idx).reduce((sum, [, c]) => sum + (c / total) * 100, 0)
                    const circumference = 2 * Math.PI * 40
                    const offset = circumference - (percentage / 100) * circumference
                    const rotation = (prevPercentages / 100) * 360
                    return (
                      <circle
                        key={status}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={statusColors[status] || '#9ca3af'}
                        strokeWidth="20"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '50% 50%' }}
                      />
                    )
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-3xl font-bold text-gray-900">{totalReservations}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {Object.entries(stats.byStatus).map(([status, count]) => {
                const percentage = ((count / totalReservations) * 100).toFixed(1)
                return (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors[status] }} />
                      <span className="text-gray-700">{statusLabels[status] || status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{count}</span>
                      <span className="text-gray-400 text-xs">({percentage}%)</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Statut des chauffeurs */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-base font-bold text-gray-900 mb-4">Statut des chauffeurs</h2>
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                  {[
                    { label: 'Disponibles', count: stats.drivers.DISPONIBLE, color: '#10b981' },
                    { label: 'En course', count: stats.drivers.EN_COURSE, color: '#8b5cf6' },
                    { label: 'Hors ligne', count: stats.drivers.HORS_LIGNE, color: '#6b7280' },
                  ].map((item, idx, arr) => {
                    const total = arr.reduce((sum, i) => sum + i.count, 0)
                    const percentage = (item.count / total) * 100
                    const prevPercentages = arr.slice(0, idx).reduce((sum, i) => sum + (i.count / total) * 100, 0)
                    const circumference = 2 * Math.PI * 40
                    const offset = circumference - (percentage / 100) * circumference
                    const rotation = (prevPercentages / 100) * 360
                    return (
                      <circle
                        key={item.label}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={item.color}
                        strokeWidth="20"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '50% 50%' }}
                      />
                    )
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-3xl font-bold text-gray-900">{stats.drivers.actifs}</p>
                  <p className="text-xs text-gray-500">Actifs</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Disponibles', count: stats.drivers.DISPONIBLE, color: '#10b981' },
                { label: 'En course', count: stats.drivers.EN_COURSE, color: '#8b5cf6' },
                { label: 'Hors ligne', count: stats.drivers.HORS_LIGNE, color: '#6b7280' },
              ].map(item => {
                const total = stats.drivers.DISPONIBLE + stats.drivers.EN_COURSE + stats.drivers.HORS_LIGNE
                const percentage = ((item.count / total) * 100).toFixed(1)
                return (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-700">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{item.count}</span>
                      <span className="text-gray-400 text-xs">({percentage}%)</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Liste détaillée des chauffeurs actifs */}
        {stats.driversDetails && stats.driversDetails.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-base font-bold text-gray-900 mb-4">Chauffeurs actifs</h2>
            <div className="space-y-2">
              {stats.driversDetails.map(driver => (
                <div
                  key={driver.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {driver.firstName} {driver.lastName}
                      </p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        driver.status === 'DISPONIBLE'
                          ? 'bg-emerald-100 text-emerald-700'
                          : driver.status === 'EN_COURSE'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {driver.status === 'DISPONIBLE' ? 'Disponible' : driver.status === 'EN_COURSE' ? 'En course' : 'Hors ligne'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {driver.vehicleType} • {driver.vehiclePlate}
                    </p>
                    {driver.activeCourse && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-600">
                          <span className="font-semibold">Course active:</span> {driver.activeCourse.code}
                        </p>
                        <p className="text-xs text-gray-500">
                          {driver.activeCourse.pickupZone} → {driver.activeCourse.dropoffZone}
                        </p>
                        <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          driver.activeCourse.status === 'ASSIGNEE'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {driver.activeCourse.status === 'ASSIGNEE' ? 'Assignée' : 'En cours'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modale envoi manuel des rapports */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Envoi manuel des rapports</h3>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <p className="text-sm font-semibold text-amber-900">⚠ Action sensible</p>
                <p className="text-xs text-amber-700 mt-1">
                  Tous les chauffeurs et administrateurs recevront immédiatement leur rapport PDF par email.
                  Cette action ne peut pas être annulée.
                </p>
                <p className="text-xs text-amber-600 mt-2 font-medium">
                  Période : {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </p>
              </div>

              <form onSubmit={handleSendReport} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                    Mot de passe admin pour confirmer
                  </label>
                  <input
                    type="password"
                    value={reportPassword}
                    onChange={e => { setReportPassword(e.target.value); setReportError('') }}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    required
                    autoFocus
                  />
                  {reportError && (
                    <p className="text-xs text-red-600 mt-1.5 font-medium">{reportError}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={sendingReport || !reportPassword}
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {sendingReport ? 'Envoi en cours...' : 'Envoyer maintenant'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}