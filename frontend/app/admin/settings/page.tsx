'use client'

import { useState, useEffect } from 'react'
import { adminApi } from '@/lib/api'

interface Setting {
  id: string
  key: string
  value: string
  description: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const { data } = await adminApi.getSettings()
      setSettings(data)
      const initialValues: Record<string, string> = {}
      data.forEach((s: Setting) => {
        initialValues[s.key] = s.value
      })
      setEditValues(initialValues)
    } catch (err) {
      console.error('Failed to load settings', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (key: string) => {
    setSaving(key)
    try {
      await adminApi.updateSetting(key, { value: editValues[key] })
      await loadSettings()
    } catch (err) {
      console.error('Failed to update setting', err)
    } finally {
      setSaving(null)
    }
  }

  const formatCurrency = (value: string) => {
    const num = parseInt(value, 10)
    return new Intl.NumberFormat('fr-FR').format(num) + ' FCFA'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">⚙️ Paramètres</h1>
          <p className="text-sm text-gray-500 mt-1">Gérer les prix fixes des trajets</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-blue-50">
            <h2 className="text-lg font-bold text-gray-900">💰 Prix fixes par type de trajet</h2>
            <p className="text-sm text-gray-600 mt-1">
              Ces prix s'appliquent à tous les trajets, peu importe la distance ou la destination
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {settings.map(setting => (
              <div key={setting.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {setting.key === 'PRICE_ALLER_SIMPLE' && '🚗 Aller simple'}
                      {setting.key === 'PRICE_RETOUR_SIMPLE' && '🔙 Retour simple'}
                      {setting.key === 'PRICE_ALLER_RETOUR' && '🔄 Aller-retour'}
                    </h3>
                    <p className="text-sm text-gray-500">{setting.description}</p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(editValues[setting.key] || setting.value)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={editValues[setting.key] || ''}
                    onChange={e => setEditValues({ ...editValues, [setting.key]: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Prix en FCFA"
                    min="0"
                    step="1000"
                  />
                  <button
                    onClick={() => handleSave(setting.key)}
                    disabled={saving === setting.key || editValues[setting.key] === setting.value}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving === setting.key ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-900 mb-1">Important</h3>
              <p className="text-sm text-amber-700">
                Les modifications de prix s'appliquent immédiatement à toutes les nouvelles réservations.
                Les réservations existantes conservent leur prix d'origine.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">ℹ️</div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">Système de prix fixes</h3>
              <ul className="text-sm text-blue-700 space-y-1 mt-2">
                <li>• <strong>Aller simple :</strong> Trajet unique du point A au point B</li>
                <li>• <strong>Retour simple :</strong> Trajet unique du point B au point A</li>
                <li>• <strong>Aller-retour :</strong> Trajet aller + retour dans la même réservation</li>
                <li>• Les prix sont fixes peu importe la distance ou la destination choisie</li>
                <li>• Zones prédéfinies et adresses personnalisées utilisent les mêmes prix</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
