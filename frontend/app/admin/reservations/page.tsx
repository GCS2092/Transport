'use client'

import { useEffect, useState } from 'react'
import { reservationsApi, driverApi, Reservation, Driver } from '@/lib/api'
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
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('')
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState('')
  const [exporting, setExporting] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'code' | 'client'>('code')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Reservation>>({})

  useEffect(() => {
    loadData()
  }, [filter])

  const loadData = async () => {
    try {
      setLoading(true)
      const [resData, driverData] = await Promise.all([
        reservationsApi.getAll({ limit: 100, status: filter || undefined }),
        driverApi.getAll(),
      ])
      setReservations(resData.data.data || [])
      setDrivers(driverData.data || [])
    } catch (err: any) {
      console.error('Failed to load data', err)
      alert(`Erreur lors du chargement des données: ${err.response?.data?.message || err.message}`)
      setReservations([])
      setDrivers([])
    } finally {
      setLoading(false)
    }
  }

  const handleAssignDriver = async () => {
    if (!selectedReservation || !selectedDriver) return
    try {
      await reservationsApi.assignDriver(selectedReservation.id, selectedDriver)
      setShowAssignModal(false)
      setSelectedReservation(null)
      setSelectedDriver('')
      loadData()
    } catch (err) {
      console.error('Failed to assign driver', err)
      alert('Erreur lors de l\'assignation du chauffeur')
    }
  }

  const handleAutoAssign = async () => {
    if (!selectedReservation) return
    try {
      await reservationsApi.autoAssignDriver(selectedReservation.id)
      setShowAssignModal(false)
      setSelectedReservation(null)
      setSelectedDriver('')
      loadData()
      alert('Chauffeur assigné automatiquement avec succès !')
    } catch (err: any) {
      console.error('Failed to auto-assign driver', err)
      alert(err.response?.data?.message || 'Erreur lors de l\'assignation automatique')
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

  const handleArchiveCompleted = async () => {
    if (!confirm('Archiver toutes les réservations terminées/annulées de plus de 90 jours ?\n\nCette action est irréversible !')) return
    try {
      setArchiving(true)
      const result = await reservationsApi.archiveCompleted(90)
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
            <div className="flex gap-2">
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
              <button
                onClick={handleArchiveCompleted}
                disabled={archiving}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-1"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                {archiving ? 'Archivage...' : 'Archiver (>90j)'}
              </button>
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
                    <p className="text-xs text-gray-500">
                      {format(new Date(res.pickupDateTime), 'dd MMM HH:mm', { locale: fr })}
                    </p>
                  </div>
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

                {res.driver && (
                  <div className="bg-gray-50 rounded-lg p-2 mb-3">
                    <p className="text-xs text-gray-500 mb-0.5">Chauffeur assigné</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {res.driver.firstName} {res.driver.lastName}
                    </p>
                    <p className="text-xs text-gray-600">{res.driver.vehicleType} • {res.driver.vehiclePlate}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {['EN_ATTENTE', 'ASSIGNEE'].includes(res.status) && (
                    <button
                      onClick={() => {
                        setSelectedReservation(res)
                        setSelectedDriver(res.driver?.id || '')
                        setShowAssignModal(true)
                      }}
                      className="flex-1 py-2 bg-[var(--primary)] text-white rounded-lg text-xs font-semibold hover:bg-[var(--primary-hover)] transition-colors"
                    >
                      {res.driver ? 'Réassigner chauffeur' : 'Assigner un chauffeur'}
                    </button>
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
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Assigner un chauffeur</h3>
                <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                  <IconX />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Réservation</p>
                <p className="font-mono font-bold text-gray-900">{selectedReservation.code}</p>
                <p className="text-sm text-gray-700">{selectedReservation.clientFirstName} {selectedReservation.clientLastName}</p>
              </div>

              <div className="mb-4">
                <button
                  onClick={handleAutoAssign}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  Assignation automatique (chauffeur le plus proche)
                </button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Le système choisira le chauffeur disponible le plus proche basé sur la géolocalisation
                </p>
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-500">OU</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                  Sélectionner manuellement un chauffeur
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {drivers
                    .filter(d => d.isActive)
                    .sort((a, b) => {
                      if (a.status === 'DISPONIBLE' && b.status !== 'DISPONIBLE') return -1
                      if (a.status !== 'DISPONIBLE' && b.status === 'DISPONIBLE') return 1
                      return 0
                    })
                    .map(d => {
                      const hasActiveCourse = reservations.some(r => 
                        r.driver?.id === d.id && 
                        (r.status === 'ASSIGNEE' || r.status === 'EN_COURS')
                      )
                      const isAvailable = d.status === 'DISPONIBLE' && !hasActiveCourse
                      
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => isAvailable && setSelectedDriver(d.id)}
                          disabled={!isAvailable}
                          className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                            selectedDriver === d.id
                              ? 'border-emerald-500 bg-emerald-50'
                              : isAvailable
                              ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">
                                {d.firstName} {d.lastName}
                              </p>
                              <p className="text-xs text-gray-500">{d.vehicleType} • {d.vehiclePlate}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                d.status === 'DISPONIBLE' 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : d.status === 'EN_COURSE'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {d.status === 'DISPONIBLE' ? 'Disponible' : d.status === 'EN_COURSE' ? 'En course' : 'Hors ligne'}
                              </span>
                              {hasActiveCourse && (
                                <span className="text-xs font-semibold text-orange-600">Course active</span>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  {drivers.filter(d => d.isActive).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">Aucun chauffeur actif</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAssignDriver}
                  disabled={!selectedDriver}
                  className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmer
                </button>
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
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Passagers</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={editForm.passengers || 1}
                    onChange={(e) => setEditForm({ ...editForm, passengers: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
