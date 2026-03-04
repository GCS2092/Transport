'use client'

import { useEffect, useState } from 'react'
import { promoCodesApi, PromoCode, CreatePromoCodeDto } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

export default function AdminPromo() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null)
  const [formData, setFormData] = useState<CreatePromoCodeDto>({
    code: '',
    description: '',
    type: 'PERCENTAGE',
    value: 0,
  })

  useEffect(() => {
    loadPromoCodes()
  }, [])

  const loadPromoCodes = async () => {
    try {
      setLoading(true)
      const response = await promoCodesApi.getAll()
      setPromoCodes(response.data)
    } catch (err) {
      console.error('Failed to load promo codes', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingPromo) {
        await promoCodesApi.update(editingPromo.id, formData)
      } else {
        await promoCodesApi.create(formData)
      }
      setShowModal(false)
      setEditingPromo(null)
      setFormData({ code: '', description: '', type: 'PERCENTAGE', value: 0 })
      loadPromoCodes()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la sauvegarde')
    }
  }

  const handleEdit = (promo: PromoCode) => {
    setEditingPromo(promo)
    setFormData({
      code: promo.code,
      description: promo.description,
      type: promo.type,
      value: promo.value,
      minAmount: promo.minAmount || undefined,
      maxDiscount: promo.maxDiscount || undefined,
      usageLimit: promo.usageLimit || undefined,
      validFrom: promo.validFrom ? new Date(promo.validFrom).toISOString().slice(0, 16) : undefined,
      validUntil: promo.validUntil ? new Date(promo.validUntil).toISOString().slice(0, 16) : undefined,
    })
    setShowModal(true)
  }

  const handleToggleActive = async (id: string) => {
    try {
      await promoCodesApi.toggleActive(id)
      loadPromoCodes()
    } catch (err) {
      alert('Erreur lors de la modification')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce code promo ?')) return
    try {
      await promoCodesApi.delete(id)
      loadPromoCodes()
    } catch (err) {
      alert('Erreur lors de la suppression')
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Codes promo</h1>
            <p className="text-sm text-gray-500 mt-1">Gestion des codes promotionnels</p>
          </div>
          <button
            onClick={() => {
              setEditingPromo(null)
              setFormData({ code: '', description: '', type: 'PERCENTAGE', value: 0 })
              setShowModal(true)
            }}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors"
          >
            + Nouveau code
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]" />
          </div>
        ) : promoCodes.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Aucun code promo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {promoCodes.map(promo => (
              <div key={promo.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-lg font-bold text-gray-900">{promo.code}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        promo.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {promo.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{promo.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[var(--primary)]">
                      {promo.type === 'PERCENTAGE' ? `${promo.value}%` : formatCurrency(promo.value)}
                    </p>
                    <p className="text-xs text-gray-500">{promo.usageCount} utilisations</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600 mb-3">
                  {promo.minAmount && (
                    <div>
                      <span className="text-gray-500">Min:</span> {formatCurrency(promo.minAmount)}
                    </div>
                  )}
                  {promo.maxDiscount && (
                    <div>
                      <span className="text-gray-500">Max réduction:</span> {formatCurrency(promo.maxDiscount)}
                    </div>
                  )}
                  {promo.usageLimit && (
                    <div>
                      <span className="text-gray-500">Limite:</span> {promo.usageLimit}
                    </div>
                  )}
                  {promo.validUntil && (
                    <div>
                      <span className="text-gray-500">Expire:</span> {format(new Date(promo.validUntil), 'dd MMM yyyy', { locale: fr })}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(promo)}
                    className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleToggleActive(promo.id)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      promo.isActive
                        ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    }`}
                  >
                    {promo.isActive ? 'Désactiver' : 'Activer'}
                  </button>
                  <button
                    onClick={() => handleDelete(promo.id)}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 my-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingPromo ? 'Modifier le code' : 'Nouveau code promo'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <IconX />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Description</label>
                  <input
                    type="text"
                    required
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Type</label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value as 'PERCENTAGE' | 'FIXED' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="PERCENTAGE">Pourcentage</option>
                      <option value="FIXED">Montant fixe</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Valeur</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.value}
                      onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Montant min</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.minAmount || ''}
                      onChange={e => setFormData({ ...formData, minAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Réduction max</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.maxDiscount || ''}
                      onChange={e => setFormData({ ...formData, maxDiscount: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Limite d'utilisation</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.usageLimit || ''}
                    onChange={e => setFormData({ ...formData, usageLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Valide à partir de</label>
                    <input
                      type="datetime-local"
                      value={formData.validFrom || ''}
                      onChange={e => setFormData({ ...formData, validFrom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Valide jusqu'à</label>
                    <input
                      type="datetime-local"
                      value={formData.validUntil || ''}
                      onChange={e => setFormData({ ...formData, validUntil: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors"
                  >
                    {editingPromo ? 'Modifier' : 'Créer'}
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
