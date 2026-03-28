'use client'

import { useEffect, useState } from 'react'
import { reservationsApi, Reservation } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function PaymentManagementPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'refused'>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month'>('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailRes, setDetailRes] = useState<Reservation | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    loadReservations()
  }, [dateFilter])

  const loadReservations = async () => {
    setLoading(true)
    try {
      const today = new Date()
      const dateFrom = new Date()

      if (dateFilter === 'today') {
        dateFrom.setHours(0, 0, 0, 0)
      } else if (dateFilter === 'week') {
        dateFrom.setDate(today.getDate() - 7)
      } else if (dateFilter === 'month') {
        dateFrom.setDate(today.getDate() - 30)
      }

      const response = await reservationsApi.getAll({
        page: 1,
        limit: 200,
        dateFrom: dateFrom.toISOString(),
        dateTo: today.toISOString(),
      })
      setReservations(response.data.data)
    } catch (err) {
      console.error('Failed to load reservations', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async (id: string, paymentStatus: string) => {
    setUpdatingId(id)
    try {
      await reservationsApi.updatePaymentStatus(id, paymentStatus)
      await loadReservations()
      if (detailId === id && detailRes) {
        const { data } = await reservationsApi.getById(id)
        setDetailRes(data)
      }
    } catch (err: any) {
      console.error('Failed to update payment', err)
      alert(err.response?.data?.message || 'Erreur lors de la mise à jour du paiement')
    } finally {
      setUpdatingId(null)
    }
  }

  const openDetail = async (id: string) => {
    setDetailId(id)
    setDetailLoading(true)
    setDetailRes(null)
    try {
      const { data } = await reservationsApi.getById(id)
      setDetailRes(data)
    } catch {
      alert('Impossible de charger le détail de la réservation')
      setDetailId(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setDetailId(null)
    setDetailRes(null)
  }

  const filteredReservations = reservations.filter(r => {
    if (filter === 'all') {
      /* continue */
    } else if (filter === 'pending') {
      if (!(r.paymentStatus === 'EN_ATTENTE' || r.paymentStatus === 'ACOMPTE_VERSE')) return false
    } else if (filter === 'confirmed') {
      if (r.paymentStatus !== 'PAIEMENT_COMPLET') return false
    } else if (filter === 'refused') {
      if (!(r.paymentStatus === 'IMPAYE' || r.paymentStatus === 'ANNULEE')) return false
    }

    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      r.code.toLowerCase().includes(q) ||
      r.clientEmail.toLowerCase().includes(q) ||
      `${r.clientFirstName} ${r.clientLastName}`.toLowerCase().includes(q) ||
      r.clientPhone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))
    )
  })

  const pending = reservations.filter(r => r.paymentStatus === 'EN_ATTENTE' || r.paymentStatus === 'ACOMPTE_VERSE')
  const confirmed = reservations.filter(r => r.paymentStatus === 'PAIEMENT_COMPLET')
  const refused = reservations.filter(r => r.paymentStatus === 'IMPAYE' || r.paymentStatus === 'ANNULEE')
  const totalAmount = confirmed.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      EN_ATTENTE: 'bg-amber-100 text-amber-700 border-amber-200',
      ACOMPTE_VERSE: 'bg-blue-100 text-blue-700 border-blue-200',
      PAIEMENT_COMPLET: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      IMPAYE: 'bg-red-100 text-red-700 border-red-200',
    }
    const labels: Record<string, string> = {
      EN_ATTENTE: 'En attente',
      ACOMPTE_VERSE: 'Acompte',
      PAIEMENT_COMPLET: 'Confirmé',
      IMPAYE: 'Refusé / Impayé',
    }
    return { style: styles[status] || styles['EN_ATTENTE'], label: labels[status] || status }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Gestion des paiements</h1>
            <p className="text-sm text-gray-500">{format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p>
          </div>
          <button type="button" className="relative px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium">
            Notifications
            {pending.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {pending.length}
              </span>
            )}
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Recherche</label>
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Code, client, email, téléphone…"
            className="w-full max-w-md px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="mt-2 text-xs text-gray-500 underline">
              Effacer la recherche
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">En attente</p>
            <p className="text-2xl font-bold text-amber-600">{pending.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Confirmés</p>
            <p className="text-2xl font-bold text-emerald-600">{confirmed.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Refusés</p>
            <p className="text-2xl font-bold text-red-600">{refused.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total (filtré confirmés)</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { id: 'all', label: 'Tous' },
            { id: 'pending', label: 'En attente' },
            { id: 'confirmed', label: 'Confirmés' },
            { id: 'refused', label: 'Refusés / Expirés' },
          ].map(fi => (
            <button
              key={fi.id}
              type="button"
              onClick={() => setFilter(fi.id as typeof filter)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === fi.id ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {fi.label}
            </button>
          ))}

          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value as typeof dateFilter)}
            className="ml-auto px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm"
          >
            <option value="today">Aujourd&apos;hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
          </select>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Chargement...</div>
          ) : filteredReservations.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Aucune réservation trouvée</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Trajet</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Montant</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredReservations.map(reservation => {
                    const status = getStatusBadge(reservation.paymentStatus)
                    const busy = updatingId === reservation.id

                    return (
                      <tr key={reservation.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-bold text-gray-900">{reservation.code}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">
                            {reservation.clientFirstName} {reservation.clientLastName}
                          </p>
                          <p className="text-xs text-gray-500">{reservation.clientPhone}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-700">
                            {reservation.pickupZone?.name || 'Adresse'} → {reservation.dropoffZone?.name || 'Adresse'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {format(new Date(reservation.pickupDateTime), 'dd/MM/yy HH:mm', { locale: fr })}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-gray-900">{formatCurrency(reservation.amount)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${status.style}`}>
                            {status.label}
                          </span>
                          {reservation.paymentUpdatedBy && (
                            <p className="text-[10px] text-gray-500 mt-1">
                              {reservation.paymentUpdatedBy === 'DRIVER' ? 'Chauffeur' : 'Admin'}: {reservation.paymentUpdatedByName}
                              {reservation.paymentUpdatedAt && (
                                <span className="text-gray-400">
                                  {' '}
                                  • {format(new Date(reservation.paymentUpdatedAt), 'dd/MM HH:mm', { locale: fr })}
                                </span>
                              )}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => handlePayment(reservation.id, 'PAIEMENT_COMPLET')}
                              disabled={busy}
                              className="w-8 h-8 flex items-center justify-center bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 text-xs font-bold disabled:opacity-40"
                              title="Payé"
                            >
                              {busy ? '…' : '✓'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePayment(reservation.id, 'IMPAYE')}
                              disabled={busy}
                              className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs font-bold disabled:opacity-40"
                              title="Impayé"
                            >
                              ✕
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePayment(reservation.id, 'ACOMPTE_VERSE')}
                              disabled={busy}
                              className="w-8 h-8 flex items-center justify-center bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 text-xs font-bold disabled:opacity-40"
                              title="Acompte"
                            >
                              %
                            </button>
                            <button
                              type="button"
                              onClick={() => openDetail(reservation.id)}
                              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200"
                            >
                              Détail
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {detailId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeDetail}>
          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-2 mb-4">
              <h2 className="text-lg font-bold text-gray-900">Détail réservation</h2>
              <button type="button" onClick={closeDetail} className="text-gray-400 hover:text-gray-700 text-xl leading-none">
                ×
              </button>
            </div>
            {detailLoading && <p className="text-sm text-gray-500">Chargement…</p>}
            {!detailLoading && detailRes && (
              <div className="space-y-3 text-sm">
                <p>
                  <span className="text-gray-500">Code</span>{' '}
                  <span className="font-mono font-bold">{detailRes.code}</span>
                </p>
                <p>
                  <span className="text-gray-500">Client</span>{' '}
                  <span className="font-medium">
                    {detailRes.clientFirstName} {detailRes.clientLastName}
                  </span>
                  <br />
                  <span className="text-xs text-gray-600">{detailRes.clientEmail}</span>
                  <br />
                  <span className="text-xs text-gray-600">{detailRes.clientPhone}</span>
                </p>
                <p>
                  <span className="text-gray-500">Trajet</span>
                  <br />
                  {detailRes.pickupZone?.name || detailRes.pickupCustomAddress || '—'} →{' '}
                  {detailRes.dropoffZone?.name || detailRes.dropoffCustomAddress || '—'}
                </p>
                <p>
                  <span className="text-gray-500">Prise en charge</span>{' '}
                  {format(new Date(detailRes.pickupDateTime), 'dd/MM/yyyy HH:mm', { locale: fr })}
                </p>
                {detailRes.returnDateTime && (
                  <p>
                    <span className="text-gray-500">Retour</span>{' '}
                    {format(new Date(detailRes.returnDateTime), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </p>
                )}
                <p>
                  <span className="text-gray-500">Montant</span> <strong>{formatCurrency(detailRes.amount)}</strong>
                </p>
                <p>
                  <span className="text-gray-500">Statut course</span> {detailRes.status}
                </p>
                <p>
                  <span className="text-gray-500">Paiement</span> {detailRes.paymentStatus}
                </p>
                {detailRes.driver && (
                  <p>
                    <span className="text-gray-500">Chauffeur</span>{' '}
                    {detailRes.driver.firstName} {detailRes.driver.lastName} — {detailRes.driver.phone}
                  </p>
                )}
                {detailRes.notes && (
                  <p>
                    <span className="text-gray-500">Notes</span>
                    <br />
                    <span className="text-gray-800 whitespace-pre-wrap">{detailRes.notes}</span>
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => handlePayment(detailRes.id, 'PAIEMENT_COMPLET')}
                    disabled={updatingId === detailRes.id}
                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    Payé
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePayment(detailRes.id, 'IMPAYE')}
                    disabled={updatingId === detailRes.id}
                    className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    Impayé
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePayment(detailRes.id, 'ACOMPTE_VERSE')}
                    disabled={updatingId === detailRes.id}
                    className="px-3 py-2 rounded-lg bg-amber-500 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    Acompte
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
