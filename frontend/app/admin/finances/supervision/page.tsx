'use client'

import { useEffect, useState } from 'react'
import { paymentSupervisionApi, PaymentSupervisionFilters, Reservation } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function PaymentSupervisionPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [supervisionToken, setSupervisionToken] = useState<string | null>(null)
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<PaymentSupervisionFilters>({ paymentStatus: 'IMPAYE' })
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    const savedToken = sessionStorage.getItem('supervision_token')
    const savedExpiry = sessionStorage.getItem('supervision_token_expiry')
    if (savedToken && savedExpiry) {
      const expiry = new Date(savedExpiry)
      if (expiry > new Date()) {
        setSupervisionToken(savedToken)
        setTokenExpiry(expiry)
        setIsAuthenticated(true)
      } else {
        sessionStorage.removeItem('supervision_token')
        sessionStorage.removeItem('supervision_token_expiry')
      }
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && supervisionToken) {
      loadReservations()
    }
  }, [isAuthenticated, supervisionToken, page, filters])

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await paymentSupervisionApi.verifyPassword(password)
      const { supervisionToken: token, expiresAt } = response.data
      setSupervisionToken(token)
      setTokenExpiry(new Date(expiresAt))
      setIsAuthenticated(true)
      sessionStorage.setItem('supervision_token', token)
      sessionStorage.setItem('supervision_token_expiry', expiresAt)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  const loadReservations = async () => {
    if (!supervisionToken) return
    setLoading(true)
    try {
      const response = await paymentSupervisionApi.getSupervisionList(
        { ...filters, page, limit: 20 },
        supervisionToken
      )
      setReservations(response.data.reservations)
      setTotal(response.data.total)
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Session expirée. Veuillez réentrer votre mot de passe.')
        setIsAuthenticated(false)
        setSupervisionToken(null)
        sessionStorage.removeItem('supervision_token')
        sessionStorage.removeItem('supervision_token_expiry')
      } else {
        setError(err.response?.data?.message || 'Erreur lors du chargement')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePaymentStatus = async (id: string, newStatus: string) => {
    if (!supervisionToken) return
    setUpdatingId(id)
    try {
      await paymentSupervisionApi.updatePaymentStatus(id, newStatus, supervisionToken)
      await loadReservations()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la mise à jour')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setSupervisionToken(null)
    setTokenExpiry(null)
    sessionStorage.removeItem('supervision_token')
    sessionStorage.removeItem('supervision_token_expiry')
  }

  const getPaymentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      IMPAYE: 'bg-red-100 text-red-700 border-red-200',
      PAIEMENT_COMPLET: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      ACOMPTE_VERSE: 'bg-amber-100 text-amber-700 border-amber-200',
      EN_ATTENTE: 'bg-gray-100 text-gray-700 border-gray-200',
    }
    return styles[status] || styles['EN_ATTENTE']
  }

  const getPaymentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      IMPAYE: 'IMPAYÉ',
      PAIEMENT_COMPLET: 'PAYÉ',
      ACOMPTE_VERSE: 'ACOMPTE',
      EN_ATTENTE: 'EN ATTENTE',
      REMBOURSE: 'REMBOURSÉ',
    }
    return labels[status] || status
  }

  const impayes = reservations.filter(r => r.paymentStatus === 'IMPAYE')
  const montantImpaye = impayes.reduce((sum, r) => sum + r.amount, 0)

  // ─── ÉCRAN DE CONNEXION ────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 w-full max-w-sm">
          {/* Icône */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          <h1 className="text-lg font-bold text-gray-900 text-center mb-1">
            Supervision des Paiements
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Confirmez votre mot de passe admin pour accéder à cette section sécurisée.
          </p>

          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                placeholder="••••••••"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Vérification...' : 'Accéder'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            Session valable 30 minutes après connexion.
          </p>
        </div>
      </div>
    )
  }

  // ─── INTERFACE PRINCIPALE ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Supervision des Paiements</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Gestion des impayés et suivi des statuts
              {tokenExpiry && (
                <span className="ml-2 text-amber-600 font-medium">
                  · Session jusqu'à {format(tokenExpiry, 'HH:mm', { locale: fr })}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={loadReservations}
              disabled={loading}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Chargement...' : '↻ Actualiser'}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
            >
              Verrouiller
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Total courses</p>
            <p className="text-2xl font-bold text-gray-900">{total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Impayés</p>
            <p className="text-2xl font-bold text-red-600">{impayes.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Montant impayé</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(montantImpaye)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 hidden sm:block">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Page</p>
            <p className="text-2xl font-bold text-gray-900">{page} / {Math.max(1, Math.ceil(total / 20))}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filtres</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Statut paiement</label>
              <select
                value={filters.paymentStatus || ''}
                onChange={(e) => { setPage(1); setFilters({ ...filters, paymentStatus: e.target.value || undefined }) }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Tous</option>
                <option value="IMPAYE">Impayé</option>
                <option value="PAIEMENT_COMPLET">Payé</option>
                <option value="ACOMPTE_VERSE">Acompte</option>
                <option value="EN_ATTENTE">En attente</option>
              </select>
            </div>
            <div className="flex-1 min-w-[130px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Du</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => { setPage(1); setFilters({ ...filters, dateFrom: e.target.value || undefined }) }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="flex-1 min-w-[130px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Au</label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => { setPage(1); setFilters({ ...filters, dateTo: e.target.value || undefined }) }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <button
              onClick={() => { setPage(1); setFilters({ paymentStatus: 'IMPAYE' }) }}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {/* ─── VUE MOBILE : cartes ──────────────────────────────────────────── */}
        <div className="block sm:hidden space-y-3">
          {loading && reservations.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
              Chargement...
            </div>
          ) : reservations.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
              Aucune course trouvée
            </div>
          ) : (
            reservations.map((reservation) => (
              <div
                key={reservation.id}
                className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
              >
                {/* Ligne 1 : code + badge statut */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-gray-900">
                    #{reservation.code}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getPaymentStatusBadge(reservation.paymentStatus)}`}>
                    {getPaymentStatusLabel(reservation.paymentStatus)}
                  </span>
                </div>

                {/* Ligne 2 : client */}
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {reservation.clientFirstName} {reservation.clientLastName}
                  </p>
                  <p className="text-xs text-gray-500">{reservation.clientPhone}</p>
                </div>

                {/* Ligne 3 : chauffeur */}
                {reservation.driver ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                      {reservation.driver.firstName?.[0]}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">
                        {reservation.driver.firstName} {reservation.driver.lastName}
                      </p>
                      <p className="text-xs text-gray-400">{reservation.driver.phone}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Aucun chauffeur assigné</p>
                )}

                {/* Ligne 4 : trajet */}
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 space-y-0.5">
                  <p>📍 {reservation.pickupZone?.name || 'Adresse personnalisée'}</p>
                  <p>🏁 {reservation.dropoffZone?.name || 'Adresse personnalisée'}</p>
                  <p className="text-gray-400">
                    {format(new Date(reservation.pickupDateTime), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </p>
                </div>

                {/* Ligne 5 : montant + qui a mis à jour + action */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-base font-bold text-gray-900">
                      {formatCurrency(reservation.amount)}
                    </span>
                    {reservation.paymentUpdatedBy && (
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {reservation.paymentUpdatedBy === 'DRIVER' ? '👤 Chauffeur' : '🛡️ Admin'}: {reservation.paymentUpdatedByName}
                      </p>
                    )}
                  </div>
                  {reservation.paymentStatus === 'IMPAYE' ? (
                    <button
                      onClick={() => handleUpdatePaymentStatus(reservation.id, 'PAIEMENT_COMPLET')}
                      disabled={updatingId === reservation.id}
                      className="px-4 py-2 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                    >
                      {updatingId === reservation.id ? '...' : '✓ Marquer payé'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdatePaymentStatus(reservation.id, 'IMPAYE')}
                      disabled={updatingId === reservation.id}
                      className="px-4 py-2 bg-red-100 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
                    >
                      {updatingId === reservation.id ? '...' : 'Marquer impayé'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ─── VUE DESKTOP : tableau ───────────────────────────────────────── */}
        <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Code', 'Client', 'Date', 'Chauffeur', 'Trajet', 'Montant', 'Statut', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && reservations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">
                      Chargement...
                    </td>
                  </tr>
                ) : reservations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">
                      Aucune course trouvée
                    </td>
                  </tr>
                ) : (
                  reservations.map((reservation) => (
                    <tr key={reservation.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-bold text-gray-900">
                          #{reservation.code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">
                          {reservation.clientFirstName} {reservation.clientLastName}
                        </p>
                        <p className="text-xs text-gray-500">{reservation.clientPhone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">
                          {format(new Date(reservation.pickupDateTime), 'dd/MM/yy HH:mm', { locale: fr })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {reservation.driver ? (
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {reservation.driver.firstName} {reservation.driver.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{reservation.driver.phone}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Non assigné</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-700">{reservation.pickupZone?.name || 'Adresse pers.'}</p>
                        <p className="text-xs text-gray-400">→ {reservation.dropoffZone?.name || 'Adresse pers.'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(reservation.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPaymentStatusBadge(reservation.paymentStatus)}`}>
                          {getPaymentStatusLabel(reservation.paymentStatus)}
                        </span>
                        {reservation.paymentUpdatedBy && (
                          <p className="text-[10px] text-gray-500 mt-1">
                            {reservation.paymentUpdatedBy === 'DRIVER' ? '👤' : '🛡️'} {reservation.paymentUpdatedByName}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {reservation.paymentStatus === 'IMPAYE' ? (
                          <button
                            onClick={() => handleUpdatePaymentStatus(reservation.id, 'PAIEMENT_COMPLET')}
                            disabled={updatingId === reservation.id}
                            className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                          >
                            {updatingId === reservation.id ? '...' : '✓ Marquer payé'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdatePaymentStatus(reservation.id, 'IMPAYE')}
                            disabled={updatingId === reservation.id}
                            className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
                          >
                            {updatingId === reservation.id ? '...' : 'Impayé'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              ← Précédent
            </button>
            <span className="text-sm text-gray-600 font-medium">
              Page {page} sur {Math.ceil(total / 20)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 20)}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Suivant →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}