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
  const [searchQuery, setSearchQuery] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
  const montantImpaye = impayes.reduce((sum, r) => sum + (r.amount || 0), 0)

  const renderDriver = (r: Reservation) => {
    if (r.driver) return (
      <span className="text-xs font-medium text-gray-700">
        👤 {r.driver.firstName} {r.driver.lastName}
        <span className="text-gray-400 font-normal"> · {r.driver.phone}</span>
      </span>
    )
    if (r.externalDriverName) return (
      <span className="text-xs font-medium text-emerald-700">
        🤝 {r.externalDriverName}
        <span className="text-gray-400 font-normal"> · {r.externalDriverPhone}</span>
      </span>
    )
    return <span className="text-xs text-gray-400 italic">Non assigné</span>
  }

  const renderPaymentActions = (r: Reservation) => (
    <div className="flex gap-1.5 flex-wrap">
      {r.paymentStatus !== 'PAIEMENT_COMPLET' && (
        <button onClick={() => handleUpdatePaymentStatus(r.id, 'PAIEMENT_COMPLET')} disabled={updatingId === r.id}
          className="px-2.5 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors">
          {updatingId === r.id ? '...' : '✓ Payé'}
        </button>
      )}
      {r.paymentStatus !== 'ACOMPTE_VERSE' && (
        <button onClick={() => handleUpdatePaymentStatus(r.id, 'ACOMPTE_VERSE')} disabled={updatingId === r.id}
          className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg hover:bg-amber-200 disabled:opacity-50 transition-colors">
          {updatingId === r.id ? '...' : '💰 Acompte'}
        </button>
      )}
      {r.paymentStatus !== 'IMPAYE' && (
        <button onClick={() => handleUpdatePaymentStatus(r.id, 'IMPAYE')} disabled={updatingId === r.id}
          className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors">
          {updatingId === r.id ? '...' : '✗ Impayé'}
        </button>
      )}
    </div>
  )

  // Filtrage par recherche
  const filteredReservations = reservations.filter(r => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      r.code.toLowerCase().includes(query) ||
      r.clientEmail.toLowerCase().includes(query) ||
      `${r.clientFirstName} ${r.clientLastName}`.toLowerCase().includes(query) ||
      r.clientPhone.includes(query) ||
      r.pickupZone?.name?.toLowerCase().includes(query) ||
      r.dropoffZone?.name?.toLowerCase().includes(query) ||
      r.driver?.firstName?.toLowerCase().includes(query) ||
      r.driver?.lastName?.toLowerCase().includes(query) ||
      r.externalDriverName?.toLowerCase().includes(query) ||
      r.externalDriverPhone?.includes(query) ||
      r.externalDriverPlate?.toLowerCase().includes(query) ||
      r.externalDriverVehicle?.toLowerCase().includes(query)
    )
  })

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

        {/* Barre de recherche */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recherche</p>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par code, client, chauffeur, trajet..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-gray-500 mt-2">
              {filteredReservations.length} résultat(s) trouvé(s) sur {reservations.length} courses
            </p>
          )}
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

        {/* ─── Liste accordion ───────────────────────────────────────────── */}
        {loading && reservations.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">Chargement...</div>
        ) : filteredReservations.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">Aucune course trouvée</div>
        ) : (
          <div className="space-y-2">
            {filteredReservations.map((r) => {
              const isExpanded = expandedId === r.id
              return (
                <div key={r.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">

                  {/* Ligne compacte */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-mono text-sm font-bold text-gray-900 shrink-0">#{r.code}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${getPaymentStatusBadge(r.paymentStatus)}`}>
                          {getPaymentStatusLabel(r.paymentStatus)}
                        </span>
                        <span className="text-sm text-gray-700 font-semibold truncate hidden sm:block">
                          {r.clientFirstName} {r.clientLastName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(r.amount)}</p>
                          <p className="text-[10px] text-gray-500">{format(new Date(r.pickupDateTime), 'dd MMM HH:mm', { locale: fr })}</p>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          className={`text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 shrink-0">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      <span className="text-xs text-gray-500 truncate">
                        {r.pickupZone?.name || 'Adresse perso'} → {r.dropoffZone?.name || 'Adresse perso'}
                      </span>
                      <span className="text-sm font-semibold text-gray-700 sm:hidden ml-auto shrink-0">{r.clientFirstName} {r.clientLastName}</span>
                    </div>
                  </button>

                  {/* Détails (expandés) */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">

                      {/* Client + chauffeur */}
                      <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
                        <div>
                          <span className="text-gray-400">Client · </span>
                          <span className="font-semibold text-gray-800">{r.clientFirstName} {r.clientLastName}</span>
                          <span className="text-gray-500"> · {r.clientPhone}</span>
                        </div>
                        <div>{renderDriver(r)}</div>
                      </div>

                      {/* Paiement mis à jour par */}
                      {r.paymentUpdatedBy && (
                        <p className="text-[10px] text-gray-400">
                          Mis à jour par {r.paymentUpdatedBy === 'DRIVER' ? '👤 Chauffeur' : '🛡️ Admin'} {r.paymentUpdatedByName}
                          {r.paymentUpdatedAt && ` · ${format(new Date(r.paymentUpdatedAt), 'dd/MM HH:mm', { locale: fr })}`}
                        </p>
                      )}

                      {/* Actions paiement */}
                      <div className="pt-2 border-t border-gray-100">
                        {renderPaymentActions(r)}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

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