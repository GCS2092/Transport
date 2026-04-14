'use client'

import { useEffect, useState } from 'react'
import { reservationsApi, Reservation } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

const IconFilter = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
)

const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

export default function AdminReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('')
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [archivePeriod, setArchivePeriod] = useState<number>(90)
  const [archiveBeforeLocal, setArchiveBeforeLocal] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'code' | 'client'>('code')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Reservation>>({})
  // Seulement assignation externe (partenaires) - pas de chauffeurs plateforme internes
  const [externalDriver, setExternalDriver] = useState({
    name: '',
    phone: '',
    plate: '',
    vehicle: ''
  })
  const [showReservationSheet, setShowReservationSheet] = useState(false)
  const [sheetReservation, setSheetReservation] = useState<Reservation | null>(null)

  useEffect(() => {
    loadData()
  }, [filter])

  const loadData = async () => {
    try {
      setLoading(true)
      const resData = await reservationsApi.getAll({ limit: 100, status: filter || undefined })
      setReservations(resData.data.data || [])
    } catch (err: any) {
      console.error('Failed to load data', err)
      alert(`Erreur lors du chargement des données: ${err.response?.data?.message || err.message}`)
      setReservations([])
    } finally {
      setLoading(false)
    }
  }

  const handleAssignExternalDriver = async () => {
    if (!selectedReservation) return
    if (!externalDriver.name || !externalDriver.phone || !externalDriver.plate || !externalDriver.vehicle) {
      alert('Veuillez remplir tous les champs du chauffeur externe')
      return
    }
    try {
      await reservationsApi.assignExternalDriver(selectedReservation.id, externalDriver)
      setShowAssignModal(false)
      setSelectedReservation(null)
      setExternalDriver({ name: '', phone: '', plate: '', vehicle: '' })
      loadData()
    } catch (err: any) {
      console.error('Failed to assign external driver', err)
      alert(err.response?.data?.message || 'Erreur lors de l\'assignation du chauffeur externe')
    }
  }

  const handleCancelReservation = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) return
    try {
      await reservationsApi.cancelByAdmin(id)
      loadData()
    } catch (err) {
      console.error('Failed to cancel reservation', err)
      alert('Erreur lors de l\'annulation')
    }
  }

  const handleExportCsv = async () => {
    try {
      setExporting(true)
      const response = await reservationsApi.exportCsv({ status: filter || undefined })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reservations-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export CSV', err)
      alert('Erreur lors de l\'export CSV')
    } finally {
      setExporting(false)
    }
  }

  // ✅ MODIFIÉ : utilise archivePeriod au lieu de 90 hardcodé
  const handleArchiveCompleted = async () => {
    if (!confirm(`Archiver toutes les réservations terminées/annulées créées il y a plus de ${archivePeriod} jours ?\n\nElles seront retirées du tableau de bord ; un email de confirmation avec pièces jointes sera envoyé aux administrateurs.`)) return
    try {
      setArchiving(true)
      const result = await reservationsApi.archiveCompleted({ olderThanDays: archivePeriod })
      alert(`${result.data.archived} réservation(s) archivée(s)`)
      loadData()
    } catch (err) {
      console.error('Failed to archive', err)
      alert('Erreur lors de l\'archivage')
    } finally {
      setArchiving(false)
    }
  }

  const handleArchiveBeforeDate = async () => {
    if (!archiveBeforeLocal) {
      alert('Indiquez une date et heure : toutes les réservations terminées ou annulées créées avant ce moment seront archivées.')
      return
    }
    const d = new Date(archiveBeforeLocal)
    if (Number.isNaN(d.getTime())) {
      alert('Date invalide')
      return
    }
    if (
      !confirm(
        `Archiver toutes les réservations terminées/annulées dont la date de création est antérieure au ${d.toLocaleString('fr-FR')} ?\n\nUn email de confirmation sera envoyé. Les lignes disparaissent du dashboard mais restent en base (table d'archives).`,
      )
    )
      return
    try {
      setArchiving(true)
      const result = await reservationsApi.archiveCompleted({ createdBefore: d.toISOString() })
      alert(`${result.data.archived} réservation(s) archivée(s)`)
      loadData()
    } catch (err) {
      console.error('Failed to archive', err)
      alert('Erreur lors de l\'archivage')
    } finally {
      setArchiving(false)
    }
  }

  const handleEditReservation = (res: Reservation) => {
    setSelectedReservation(res)
    setEditForm({
      clientFirstName: res.clientFirstName,
      clientLastName: res.clientLastName,
      clientEmail: res.clientEmail,
      clientPhone: res.clientPhone,
      pickupDateTime: res.pickupDateTime,
      passengers: res.passengers,
      notes: res.notes || '',
      // Champs vol - AJOUTÉS
      airlineCompany: res.airlineCompany || '',
      flightNumber: res.flightNumber || '',
      departureTime: res.departureTime || '',
      landingTime: res.landingTime || '',
      flightDetails: res.flightDetails || '',
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedReservation) return
    try {
      await reservationsApi.updateReservation(selectedReservation.id, editForm as any)
      setShowEditModal(false)
      setSelectedReservation(null)
      setEditForm({})
      loadData()
    } catch (err) {
      console.error('Failed to update reservation', err)
      alert('Erreur lors de la modification')
    }
  }

  const handleUpdatePaymentStatus = async (reservationId: string, status: string) => {
    try {
      await reservationsApi.updatePaymentStatus(reservationId, status)
      loadData()
    } catch (err: any) {
      console.error('Failed to update payment status', err)
      alert(err.response?.data?.message || 'Erreur lors de la mise à jour du paiement')
    }
  }

  // Statistiques des réservations
  const statusColors: Record<string, string> = {
    EN_ATTENTE: 'bg-amber-100 text-amber-800',
    ASSIGNEE: 'bg-blue-100 text-blue-800',
    EN_COURS: 'bg-purple-100 text-purple-800',
    TERMINEE: 'bg-emerald-100 text-emerald-800',
    ANNULEE: 'bg-red-100 text-red-800',
  }

  const statusLabels: Record<string, string> = {
    EN_ATTENTE: 'En attente',
    ASSIGNEE: 'Assignée',
    EN_COURS: 'En cours',
    TERMINEE: 'Terminée',
    ANNULEE: 'Annulée',
  }

  const paymentStatusLabels: Record<string, string> = {
    EN_ATTENTE: 'En attente',
    ACOMPTE_VERSE: 'Acompte versé',
    PAIEMENT_COMPLET: 'Payé',
    IMPAYE: 'Impayé',
    REMBOURSE: 'Remboursé',
  }

  const paymentStatusColors: Record<string, string> = {
    EN_ATTENTE: 'bg-gray-100 text-gray-600',
    ACOMPTE_VERSE: 'bg-blue-100 text-blue-700',
    PAIEMENT_COMPLET: 'bg-emerald-100 text-emerald-700',
    IMPAYE: 'bg-red-100 text-red-700',
    REMBOURSE: 'bg-purple-100 text-purple-700',
  }

  const filteredReservations = reservations.filter(r => {
    if (!searchQuery) return true
    
    const query = searchQuery.toLowerCase()
    
    if (searchType === 'code') {
      return r.code.toLowerCase().includes(query)
    } else {
      // Recherche par client (email ou téléphone)
      return (
        r.clientEmail.toLowerCase().includes(query) ||
        r.clientPhone.includes(query) ||
        `${r.clientFirstName} ${r.clientLastName}`.toLowerCase().includes(query)
      )
    }
  }).filter(res => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      res.code.toLowerCase().includes(query) ||
      res.clientEmail.toLowerCase().includes(query) ||
      `${res.clientFirstName} ${res.clientLastName}`.toLowerCase().includes(query) ||
      res.clientPhone.includes(query) ||
      res.pickupZone?.name.toLowerCase().includes(query) ||
      res.dropoffZone?.name.toLowerCase().includes(query) ||
      res.driver?.firstName.toLowerCase().includes(query) ||
      res.driver?.lastName.toLowerCase().includes(query) ||
      res.amount.toString().includes(query)
    )
  })

  return (
    <div className="bg-gray-50 pb-6">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Gestion des courses</h1>
          <p className="text-sm text-gray-500 mt-1">Liste et assignation des réservations</p>
        </div>

        {/* Barre de recherche */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex gap-3 mb-3">
            <button
              onClick={() => setSearchType('code')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                searchType === 'code'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🔍 Par code
            </button>
            <button
              onClick={() => setSearchType('client')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                searchType === 'client'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              👤 Par client
            </button>
          </div>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <IconSearch />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                searchType === 'code'
                  ? 'Rechercher par code de réservation (ex: VTC-ABC123)...'
                  : 'Rechercher par nom, email ou téléphone du client...'
              }
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <IconX />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-gray-500 mt-2">
              {filteredReservations.length} résultat(s) trouvé(s)
            </p>
          )}
        </div>

        {/* Filtres et Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <IconFilter />
              <span className="text-sm font-semibold text-gray-700">Filtrer par statut</span>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={handleExportCsv}
                disabled={exporting}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-1"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {exporting ? 'Export...' : 'Export CSV'}
              </button>

              {/* ✅ MODIFIÉ : sélecteur de période + bouton archivage */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-1">
                  <select
                    value={archivePeriod}
                    onChange={(e) => setArchivePeriod(Number(e.target.value))}
                    disabled={archiving}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50"
                  >
                    <option value={30}>30 jours</option>
                    <option value={60}>60 jours</option>
                    <option value={90}>90 jours</option>
                    <option value={180}>6 mois</option>
                    <option value={365}>1 an</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleArchiveCompleted}
                    disabled={archiving}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    {archiving ? 'Archivage...' : `Archiver (>${archivePeriod}j)`}
                  </button>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">ou avant</span>
                  <input
                    type="datetime-local"
                    value={archiveBeforeLocal}
                    onChange={(e) => setArchiveBeforeLocal(e.target.value)}
                    disabled={archiving}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-800 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleArchiveBeforeDate}
                    disabled={archiving}
                    className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition-all disabled:opacity-50"
                  >
                    Archiver par date
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {['', 'EN_ATTENTE', 'ASSIGNEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === status
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === '' ? 'Toutes' : statusLabels[status]}
              </button>
            ))}
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]" />
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Aucune réservation trouvée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReservations.map(res => (
              <div key={res.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-bold text-gray-900">{res.code}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[res.status]}`}>
                        {statusLabels[res.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 font-semibold">
                      {res.clientFirstName} {res.clientLastName}
                    </p>
                    <p className="text-xs text-gray-500">{res.clientPhone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(res.amount)}</p>
                    {res.currency && (
                      <p className="text-[10px] text-blue-600 font-semibold">Affiché en {res.currency}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {format(new Date(res.pickupDateTime), 'dd MMM HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span>{res.passengers} passager{res.passengers > 1 ? 's' : ''}</span>
                  {res.vehicleCount && res.vehicleCount > 1 && (
                    <span className="text-amber-600 font-semibold">({res.vehicleCount} véhicules)</span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span className="truncate">
                    {res.pickupZone?.name || res.pickupCustomAddress || 'Adresse personnalisée'} → {res.dropoffZone?.name || res.dropoffCustomAddress || 'Adresse personnalisée'}
                  </span>
                </div>

                {(res.flightNumber || res.airlineCompany) && (
                  <div className="bg-blue-50 rounded-lg p-2 mb-3">
                    <p className="text-[10px] text-blue-600 font-semibold uppercase mb-1">✈️ Infos vol</p>
                    <p className="text-xs text-gray-700">
                      {res.airlineCompany && <span className="font-semibold">{res.airlineCompany}</span>}
                      {res.flightNumber && <span className="font-mono"> • {res.flightNumber}</span>}
                    </p>
                    {(res.departureTime || res.landingTime) && (
                      <p className="text-xs text-gray-600 mt-0.5">
                        {res.departureTime && <span>Décollage: {res.departureTime}</span>}
                        {res.departureTime && res.landingTime && ' • '}
                        {res.landingTime && <span>Atterrissage: {res.landingTime}</span>}
                      </p>
                    )}
                  </div>
                )}


                {/* Chauffeur externe (partenaire) */}
                {res.externalDriverName && (
                  <div className="bg-emerald-50 rounded-lg p-2 mb-3 border border-emerald-100">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs text-emerald-600 font-medium">🤝 Chauffeur partenaire</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {res.externalDriverName}
                    </p>
                    <p className="text-xs text-gray-600">{res.externalDriverVehicle} • {res.externalDriverPlate}</p>
                    <p className="text-xs text-gray-500 mt-0.5">📞 {res.externalDriverPhone}</p>

                    {/* Bouton WhatsApp */}
                    <a
                      href={`https://wa.me/${res.externalDriverPhone?.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Bonjour ${res.externalDriverName},\n\n` +
                        `Nouvelle course WEND'D Transport :\n` +
                        `📋 Code: ${res.code}\n` +
                        `👤 Client: ${res.clientFirstName} ${res.clientLastName}\n` +
                        `📞 Client: ${res.clientPhone}\n` +
                        `📍 Départ: ${res.pickupZone?.name || res.pickupCustomAddress}\n` +
                        `🏁 Destination: ${res.dropoffZone?.name || res.dropoffCustomAddress}\n` +
                        `🕐 Date: ${format(new Date(res.pickupDateTime), 'dd/MM HH:mm', { locale: fr })}\n` +
                        `👥 Passagers: ${res.passengers}\n\n` +
                        `Véhicule: ${res.externalDriverVehicle} (${res.externalDriverPlate})\n\n` +
                        `Merci de confirmer la prise en charge.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      WhatsApp
                    </a>
                  </div>
                )}

                {/* Statut de paiement avec badge */}
                {res.status === 'TERMINEE' && (
                  <div className="bg-gray-50 rounded-lg p-2 mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-500">Paiement</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${paymentStatusColors[res.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>
                        {paymentStatusLabels[res.paymentStatus] || res.paymentStatus}
                      </span>
                    </div>
                    {res.paymentUpdatedBy && (
                      <p className="text-[10px] text-gray-500">
                        {res.paymentUpdatedBy === 'DRIVER' ? '👤 Chauffeur' : '🛡️ Admin'}: {res.paymentUpdatedByName}
                        {res.paymentUpdatedAt && (
                          <span className="text-gray-400"> • {format(new Date(res.paymentUpdatedAt), 'dd/MM HH:mm', { locale: fr })}</span>
                        )}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {['EN_ATTENTE', 'ASSIGNEE'].includes(res.status) && (
                    <button
                      onClick={() => {
                        setSelectedReservation(res)
                        setShowAssignModal(true)
                      }}
                      className="flex-1 py-2 bg-[var(--primary)] text-white rounded-lg text-xs font-semibold hover:bg-[var(--primary-hover)] transition-colors"
                    >
                      {res.externalDriverName ? 'Changer chauffeur' : 'Assigner chauffeur'}
                    </button>
                  )}
                  
                  {/* Boutons de paiement pour courses terminées */}
                  {res.status === 'TERMINEE' && (
                    <>
                      <button
                        onClick={() => handleUpdatePaymentStatus(res.id, 'PAIEMENT_COMPLET')}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          res.paymentStatus === 'PAIEMENT_COMPLET'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}
                        title="Marquer comme payé"
                      >
                        ✓ Payé
                      </button>
                      <button
                        onClick={() => handleUpdatePaymentStatus(res.id, 'IMPAYE')}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          res.paymentStatus === 'IMPAYE'
                            ? 'bg-red-600 text-white'
                            : 'bg-red-50 text-red-600 hover:bg-red-100'
                        }`}
                        title="Marquer comme impayé"
                      >
                        ✗ Impayé
                      </button>
                      <button
                        onClick={() => handleUpdatePaymentStatus(res.id, 'ACOMPTE_VERSE')}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          res.paymentStatus === 'ACOMPTE_VERSE'
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                        title="Marquer avec acompte"
                      >
                        💰 Acompte
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => handleEditReservation(res)}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
                  >
                    Modifier
                  </button>
                  {['EN_ATTENTE', 'ASSIGNEE'].includes(res.status) && (
                    <button
                      onClick={() => handleCancelReservation(res.id)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal assignation */}
        {showAssignModal && selectedReservation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Assigner un chauffeur externe</h3>
                <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                  <IconX />
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Réservation</p>
                <p className="font-mono font-bold text-gray-900">{selectedReservation.code}</p>
                <p className="text-sm text-gray-700">{selectedReservation.clientFirstName} {selectedReservation.clientLastName}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedReservation.pickupZone?.name || selectedReservation.pickupCustomAddress} → {selectedReservation.dropoffZone?.name || selectedReservation.dropoffCustomAddress}
                </p>
              </div>

              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-800">
                  <span className="font-semibold">🤝 Mode Partenaire</span><br/>
                  Assignez un chauffeur externe en entrant ses informations manuellement.
                </p>
              </div>

              <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                    Nom du chauffeur
                  </label>
                  <input
                    type="text"
                    value={externalDriver.name}
                    onChange={(e) => setExternalDriver({ ...externalDriver, name: e.target.value })}
                    placeholder="Ex: Mamadou Diallo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={externalDriver.phone}
                    onChange={(e) => setExternalDriver({ ...externalDriver, phone: e.target.value })}
                    placeholder="Ex: +221 77 123 45 67"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                    Plaque d'immatriculation
                  </label>
                  <input
                    type="text"
                    value={externalDriver.plate}
                    onChange={(e) => setExternalDriver({ ...externalDriver, plate: e.target.value })}
                    placeholder="Ex: DK-1234-AB"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                    Marque et modèle du véhicule
                  </label>
                  <input
                    type="text"
                    value={externalDriver.vehicle}
                    onChange={(e) => setExternalDriver({ ...externalDriver, vehicle: e.target.value })}
                    placeholder="Ex: Toyota Corolla 2020"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleAssignExternalDriver}
                    disabled={!externalDriver.name || !externalDriver.phone || !externalDriver.plate || !externalDriver.vehicle}
                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Assigner externe
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal édition */}
        {showEditModal && selectedReservation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 my-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Modifier la réservation</h3>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                  <IconX />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Code</label>
                  <input
                    type="text"
                    value={selectedReservation.code}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Prénom</label>
                    <input
                      type="text"
                      value={editForm.clientFirstName || ''}
                      onChange={(e) => setEditForm({ ...editForm, clientFirstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Nom</label>
                    <input
                      type="text"
                      value={editForm.clientLastName || ''}
                      onChange={(e) => setEditForm({ ...editForm, clientLastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Email</label>
                  <input
                    type="email"
                    value={editForm.clientEmail || ''}
                    onChange={(e) => setEditForm({ ...editForm, clientEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Téléphone</label>
                  <input
                    type="tel"
                    value={editForm.clientPhone || ''}
                    onChange={(e) => setEditForm({ ...editForm, clientPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Date et heure pickup</label>
                  <input
                    type="datetime-local"
                    value={editForm.pickupDateTime ? new Date(editForm.pickupDateTime).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditForm({ ...editForm, pickupDateTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Passagers / Véhicules</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={editForm.passengers || 1}
                    onChange={(e) => setEditForm({ ...editForm, passengers: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {editForm.passengers && editForm.passengers > 4 && (
                    <p className="text-xs text-amber-600 mt-1">⚠️ {Math.ceil((editForm.passengers || 1) / 4)} véhicules nécessaires</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Compagnie aérienne</label>
                  <input
                    type="text"
                    value={editForm.airlineCompany || ''}
                    onChange={(e) => setEditForm({ ...editForm, airlineCompany: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Air France, Royal Air Maroc..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">N° de vol</label>
                    <input
                      type="text"
                      value={editForm.flightNumber || ''}
                      onChange={(e) => setEditForm({ ...editForm, flightNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="AF718"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Horaires</label>
                    <div className="flex gap-2">
                      <input
                        type="time"
                        value={editForm.departureTime || ''}
                        onChange={(e) => setEditForm({ ...editForm, departureTime: e.target.value })}
                        className="flex-1 px-2 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Décollage"
                      />
                      <input
                        type="time"
                        value={editForm.landingTime || ''}
                        onChange={(e) => setEditForm({ ...editForm, landingTime: e.target.value })}
                        className="flex-1 px-2 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Atterrissage"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Détails du vol</label>
                  <textarea
                    value={editForm.flightDetails || ''}
                    onChange={(e) => setEditForm({ ...editForm, flightDetails: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Terminal, porte, salle de bagages..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Notes</label>
                  <textarea
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}