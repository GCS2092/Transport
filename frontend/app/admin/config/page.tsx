'use client'

import { useEffect, useState } from 'react'
import { zonesApi, tariffsApi, Zone, CreateZoneDto, CreateTariffDto } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const IconPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
)

type TabType = 'zones' | 'tarifs'

export default function AdminConfig() {
  const [tab, setTab] = useState<TabType>('zones')
  const [zones, setZones] = useState<Zone[]>([])
  const [tariffs, setTariffs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Zones
  const [showZoneModal, setShowZoneModal] = useState(false)
  const [editingZone, setEditingZone] = useState<Zone | null>(null)
  const [zoneForm, setZoneForm] = useState<CreateZoneDto>({ name: '', description: '', isActive: true })
  
  // Tarifs
  const [showTariffModal, setShowTariffModal] = useState(false)
  const [editingTariff, setEditingTariff] = useState<any | null>(null)
  const [tariffForm, setTariffForm] = useState<CreateTariffDto>({ zoneFromId: '', zoneToId: '', price: 0, isActive: true })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [zonesData, tariffsData] = await Promise.all([
        zonesApi.getAll(),
        tariffsApi.getAll(),
      ])
      setZones(zonesData.data)
      setTariffs(tariffsData.data)
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  // ── ZONES ──────────────────────────────────────────────────────────

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingZone) {
        await zonesApi.update(editingZone.id, zoneForm)
      } else {
        await zonesApi.create(zoneForm)
      }
      setShowZoneModal(false)
      setEditingZone(null)
      setZoneForm({ name: '', description: '', isActive: true })
      loadData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la sauvegarde')
    }
  }

  const handleDeleteZone = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette zone ?')) return
    try {
      await zonesApi.delete(id)
      loadData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la suppression')
    }
  }

  const openZoneModal = (zone?: Zone) => {
    if (zone) {
      setEditingZone(zone)
      setZoneForm({ name: zone.name, description: zone.description ?? '', isActive: zone.isActive })
    } else {
      setEditingZone(null)
      setZoneForm({ name: '', description: '', isActive: true })
    }
    setShowZoneModal(true)
  }

  // ── TARIFS ─────────────────────────────────────────────────────────

  const handleSaveTariff = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingTariff) {
        await tariffsApi.update(editingTariff.id, tariffForm)
      } else {
        await tariffsApi.create(tariffForm)
      }
      setShowTariffModal(false)
      setEditingTariff(null)
      setTariffForm({ zoneFromId: '', zoneToId: '', price: 0, isActive: true })
      loadData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la sauvegarde')
    }
  }

  const handleDeleteTariff = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce tarif ?')) return
    try {
      await tariffsApi.delete(id)
      loadData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la suppression')
    }
  }

  const openTariffModal = (tariff?: any) => {
    if (tariff) {
      setEditingTariff(tariff)
      setTariffForm({ 
        zoneFromId: tariff.zoneFromId, 
        zoneToId: tariff.zoneToId, 
        price: tariff.price, 
        isActive: tariff.isActive 
      })
    } else {
      setEditingTariff(null)
      setTariffForm({ zoneFromId: '', zoneToId: '', price: 0, isActive: true })
    }
    setShowTariffModal(true)
  }

  const getZoneName = (id: string) => zones.find(z => z.id === id)?.name || id

  return (
    <div className="bg-gray-50 pb-6">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Zones et tarifs</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('zones')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === 'zones'
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Zones ({zones.length})
          </button>
          <button
            onClick={() => setTab('tarifs')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === 'tarifs'
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Tarifs ({tariffs.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]" />
          </div>
        ) : (
          <>
            {/* ── ZONES ────────────────────────────────────────────── */}
            {tab === 'zones' && (
              <>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => openZoneModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors"
                  >
                    <IconPlus />
                    Nouvelle zone
                  </button>
                </div>

                <div className="space-y-3">
                  {zones.map(zone => (
                    <div key={zone.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-base font-bold text-gray-900">{zone.name}</p>
                            {!zone.isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{zone.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openZoneModal(zone)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <IconEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteZone(zone.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── TARIFS ───────────────────────────────────────────── */}
            {tab === 'tarifs' && (
              <>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => openTariffModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors"
                  >
                    <IconPlus />
                    Nouveau tarif
                  </button>
                </div>

                <div className="space-y-3">
                  {tariffs.map((tariff: any) => (
                    <div key={tariff.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-base font-bold text-gray-900">
                              {getZoneName(tariff.zoneFromId)} → {getZoneName(tariff.zoneToId)}
                            </p>
                            {!tariff.isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                                Inactif
                              </span>
                            )}
                          </div>
                          <p className="text-lg font-bold text-emerald-600">{formatCurrency(tariff.price)}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openTariffModal(tariff)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <IconEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteTariff(tariff.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── MODAL ZONE ─────────────────────────────────────────── */}
        {showZoneModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingZone ? 'Modifier la zone' : 'Nouvelle zone'}
                </h3>
                <button onClick={() => setShowZoneModal(false)} className="text-gray-400 hover:text-gray-600">
                  <IconX />
                </button>
              </div>

              <form onSubmit={handleSaveZone} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Nom</label>
                  <input
                    type="text"
                    required
                    value={zoneForm.name}
                    onChange={e => setZoneForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Description</label>
                  <textarea
                    required
                    rows={3}
                    value={zoneForm.description}
                    onChange={e => setZoneForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="zoneActive"
                    checked={zoneForm.isActive}
                    onChange={e => setZoneForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="zoneActive" className="text-sm text-gray-700">Zone active</label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowZoneModal(false)}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors"
                  >
                    {editingZone ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL TARIF ────────────────────────────────────────── */}
        {showTariffModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingTariff ? 'Modifier le tarif' : 'Nouveau tarif'}
                </h3>
                <button onClick={() => setShowTariffModal(false)} className="text-gray-400 hover:text-gray-600">
                  <IconX />
                </button>
              </div>

              <form onSubmit={handleSaveTariff} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Zone de départ</label>
                  <select
                    required
                    value={tariffForm.zoneFromId}
                    onChange={e => setTariffForm(prev => ({ ...prev, zoneFromId: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Choisir --</option>
                    {zones.filter(z => z.isActive).map(z => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Zone d'arrivée</label>
                  <select
                    required
                    value={tariffForm.zoneToId}
                    onChange={e => setTariffForm(prev => ({ ...prev, zoneToId: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Choisir --</option>
                    {zones.filter(z => z.isActive).map(z => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Prix (FCFA)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="100"
                    value={tariffForm.price}
                    onChange={e => setTariffForm(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="tariffActive"
                    checked={tariffForm.isActive}
                    onChange={e => setTariffForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="tariffActive" className="text-sm text-gray-700">Tarif actif</label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTariffModal(false)}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors"
                  >
                    {editingTariff ? 'Modifier' : 'Créer'}
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
