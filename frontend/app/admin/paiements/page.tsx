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

  useEffect(() => {
    loadReservations()
  }, [dateFilter])

  const loadReservations = async () => {
    setLoading(true)
    try {
      const today = new Date()
      let dateFrom = new Date()
      
      if (dateFilter === 'today') {
        dateFrom.setHours(0, 0, 0, 0)
      } else if (dateFilter === 'week') {
        dateFrom.setDate(today.getDate() - 7)
      } else if (dateFilter === 'month') {
        dateFrom.setDate(today.getDate() - 30)
      }

      const response = await reservationsApi.getAll({
        page: 1,
        limit: 100,
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

  const handleConfirmPayment = async (id: string) => {
    setUpdatingId(id)
    try {
      await reservationsApi.updatePaymentStatus(id, 'PAIEMENT_COMPLET')
      await loadReservations()
    } catch (err) {
      console.error('Failed to confirm payment', err)
      alert('Erreur lors de la confirmation')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleRefusePayment = async (id: string) => {
    setUpdatingId(id)
    try {
      await reservationsApi.updatePaymentStatus(id, 'IMPAYE')
      await loadReservations()
    } catch (err) {
      console.error('Failed to refuse payment', err)
      alert('Erreur lors du refus')
    } finally {
      setUpdatingId(null)
    }
  }

  // Filtrer selon le statut
  const filteredReservations = reservations.filter(r => {
    if (filter === 'all') return true
    if (filter === 'pending') return r.paymentStatus === 'EN_ATTENTE' || r.paymentStatus === 'ACOMPTE_VERSE'
    if (filter === 'confirmed') return r.paymentStatus === 'PAIEMENT_COMPLET'
    if (filter === 'refused') return r.paymentStatus === 'IMPAYE' || r.paymentStatus === 'ANNULEE'
    return true
  })

  // Stats
  const pending = reservations.filter(r => r.paymentStatus === 'EN_ATTENTE' || r.paymentStatus === 'ACOMPTE_VERSE')
  const confirmed = reservations.filter(r => r.paymentStatus === 'PAIEMENT_COMPLET')
  const refused = reservations.filter(r => r.paymentStatus === 'IMPAYE' || r.paymentStatus === 'ANNULEE')
  const totalAmount = confirmed.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'EN_ATTENTE': 'bg-amber-100 text-amber-700 border-amber-200',
      'ACOMPTE_VERSE': 'bg-blue-100 text-blue-700 border-blue-200',
      'PAIEMENT_COMPLET': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'IMPAYE': 'bg-red-100 text-red-700 border-red-200',
    }
    const labels: Record<string, string> = {
      'EN_ATTENTE': 'En attente',
      'ACOMPTE_VERSE': 'Acompte',
      'PAIEMENT_COMPLET': 'Confirmé',
      'IMPAYE': 'Refusé',
    }
    return { style: styles[status] || styles['EN_ATTENTE'], label: labels[status] || status }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Gestion des paiements</h1>
            <p className="text-sm text-gray-500">{format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p>
          </div>
          <button className="relative px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium">
            Notifications
            {pending.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {pending.length}
              </span>
            )}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
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
            <p className="text-xs text-gray-500 mb-1">Total du jour</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { id: 'all', label: 'Tous' },
            { id: 'pending', label: 'En attente' },
            { id: 'confirmed', label: 'Confirmés' },
            { id: 'refused', label: 'Refusés / Expirés' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
          
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="ml-auto px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm"
          >
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
          </select>
        </div>

        {/* Table */}
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
                  {filteredReservations.map((reservation) => {
                    const status = getStatusBadge(reservation.paymentStatus)
                    const isPending = reservation.paymentStatus === 'EN_ATTENTE' || reservation.paymentStatus === 'ACOMPTE_VERSE'
                    
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
                          {reservation.notes?.includes('WhatsApp') && (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-600 mt-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                              WhatsApp
                            </span>
                          )}
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
                            {reservation.paymentStatus === 'EN_ATTENTE' && isPending ? 'En attente ✓' : status.label}
                          </span>
                          {reservation.paymentUpdatedBy && (
                            <p className="text-[10px] text-gray-500 mt-1">
                              {reservation.paymentUpdatedBy === 'DRIVER' ? '👤 Chauffeur' : '🛡️ Admin'}: {reservation.paymentUpdatedByName}
                              {reservation.paymentUpdatedAt && (
                                <span className="text-gray-400"> • {format(new Date(reservation.paymentUpdatedAt), 'dd/MM HH:mm', { locale: fr })}</span>
                              )}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleConfirmPayment(reservation.id)}
                                  disabled={updatingId === reservation.id}
                                  className="w-8 h-8 flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                                  title="Confirmer le paiement"
                                >
                                  {updatingId === reservation.id ? '...' : '✓'}
                                </button>
                                <button
                                  onClick={() => handleRefusePayment(reservation.id)}
                                  disabled={updatingId === reservation.id}
                                  className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                  title="Refuser le paiement"
                                >
                                  ✕
                                </button>
                              </>
                            )}
                            <button className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">
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
    </div>
  )
}
