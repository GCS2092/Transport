'use client'

import { useEffect, useState } from 'react'
import { paymentSupervisionApi, PaymentSupervisionFilters } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Reservation {
  id: string
  code: string
  status: string
  clientFirstName: string
  clientLastName: string
  clientPhone: string
  pickupDateTime: string
  amount: number
  paymentStatus: string
  driver?: {
    firstName: string
    lastName: string
    phone: string
    vehiclePlate?: string
  }
  pickupZone?: { name: string }
  dropoffZone?: { name: string }
}

export default function PaymentSupervisionPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [supervisionToken, setSupervisionToken] = useState<string | null>(null)
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // List state
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<PaymentSupervisionFilters>({
    paymentStatus: 'IMPAYE',
  })
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Check for existing token on mount
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
        // Token expired, clear it
        sessionStorage.removeItem('supervision_token')
        sessionStorage.removeItem('supervision_token_expiry')
      }
    }
  }, [])

  // Load data when authenticated
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
      
      // Store in sessionStorage
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
        // Token expired
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
      // Refresh the list
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
      'IMPAYE': 'bg-red-100 text-red-700 border-red-200',
      'PAIEMENT_COMPLET': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'ACOMPTE_VERSE': 'bg-amber-100 text-amber-700 border-amber-200',
      'EN_ATTENTE': 'bg-gray-100 text-gray-700 border-gray-200',
    }
    return styles[status] || styles['EN_ATTENTE']
  }

  // Password verification screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Supervision des Paiements</h1>
            <p className="text-sm text-gray-500 mt-1">
              Cette section est sécurisée. Veuillez confirmer votre mot de passe admin.
            </p>
          </div>

          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-[var(--primary)] text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {loading ? 'Vérification...' : 'Accéder'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            Le token de supervision est valable 30 minutes.
          </p>
        </div>
      </div>
    )
  }

  // Main supervision interface
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-7xl mx-auto px-4 pt-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Supervision des Paiements</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gestion des impayés et suivi des paiements
              {tokenExpiry && (
                <span className="ml-2 text-amber-600">
                  (Session expire à {format(tokenExpiry, 'HH:mm', { locale: fr })})
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadReservations}
              disabled={loading}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? 'Chargement...' : 'Actualiser'}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100"
            >
              Sécuriser la session
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Statut paiement</label>
              <select
                value={filters.paymentStatus || ''}
                onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value || undefined })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="">Tous</option>
                <option value="IMPAYE">IMPAYÉ</option>
                <option value="PAIEMENT_COMPLET">Payé</option>
                <option value="ACOMPTE_VERSE">Acompte</option>
                <option value="EN_ATTENTE">En attente</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Du</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Au</label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ paymentStatus: 'IMPAYE' })}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold">Total</p>
            <p className="text-2xl font-bold text-gray-900">{total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold">Impayés</p>
            <p className="text-2xl font-bold text-red-600">
              {reservations.filter(r => r.paymentStatus === 'IMPAYE').length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold">Montant impayé</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(
                reservations
                  .filter(r => r.paymentStatus === 'IMPAYE')
                  .reduce((sum, r) => sum + r.amount, 0)
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase font-semibold">Page</p>
            <p className="text-2xl font-bold text-gray-900">{page} / {Math.ceil(total / 20)}</p>
          </div>
        </div>

        {/* Reservations List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Chauffeur</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Trajet</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reservations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      Aucune course trouvée
                    </td>
                  </tr>
                ) : (
                  reservations.map((reservation) => (
                    <tr key={reservation.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          #{reservation.code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">
                            {reservation.clientFirstName} {reservation.clientLastName}
                          </p>
                          <p className="text-gray-500">{reservation.clientPhone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">
                          {format(new Date(reservation.pickupDateTime), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {reservation.driver ? (
                          <div className="text-sm">
                            <p className="font-medium text-gray-900">
                              {reservation.driver.firstName} {reservation.driver.lastName}
                            </p>
                            <p className="text-gray-500 text-xs">{reservation.driver.phone}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Non assigné</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">
                          <p>{reservation.pickupZone?.name || 'Adresse pers.'}</p>
                          <p className="text-gray-400">→ {reservation.dropoffZone?.name || 'Adresse pers.'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(reservation.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getPaymentStatusBadge(reservation.paymentStatus)}`}>
                          {reservation.paymentStatus === 'IMPAYE' ? 'IMPAYÉ' : 
                           reservation.paymentStatus === 'PAIEMENT_COMPLET' ? 'PAYÉ' :
                           reservation.paymentStatus === 'ACOMPTE_VERSE' ? 'ACOMPTE' : 
                           reservation.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {reservation.paymentStatus === 'IMPAYE' ? (
                            <button
                              onClick={() => handleUpdatePaymentStatus(reservation.id, 'PAIEMENT_COMPLET')}
                              disabled={updatingId === reservation.id}
                              className="px-3 py-1 bg-emerald-500 text-white text-xs font-medium rounded hover:bg-emerald-600 disabled:opacity-50"
                            >
                              {updatingId === reservation.id ? '...' : 'Marquer payé'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdatePaymentStatus(reservation.id, 'IMPAYE')}
                              disabled={updatingId === reservation.id}
                              className="px-3 py-1 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600 disabled:opacity-50"
                            >
                              {updatingId === reservation.id ? '...' : 'Marquer impayé'}
                            </button>
                          )}
                        </div>
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
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm disabled:opacity-50"
            >
              Précédent
            </button>
            <span className="text-sm text-gray-600">
              Page {page} sur {Math.ceil(total / 20)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 20)}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
