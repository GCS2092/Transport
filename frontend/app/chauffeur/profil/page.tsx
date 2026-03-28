'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { driverApi, Driver } from '@/lib/api'
import { exportDriverCoursesPdf } from '@/lib/export-driver-courses-pdf'

const STATUS_CFG: Record<string, { label: string; dot: string; text: string }> = {
  DISPONIBLE: { label: 'Disponible',  dot: 'bg-emerald-500', text: 'text-emerald-700' },
  EN_COURSE:  { label: 'En course',   dot: 'bg-amber-400',   text: 'text-amber-700'  },
  HORS_LIGNE: { label: 'Hors ligne',  dot: 'bg-gray-400',    text: 'text-gray-500'   },
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0 gap-4">
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide flex-shrink-0 mt-0.5">{label}</p>
      {children ?? <p className="text-sm font-semibold text-gray-900 text-right">{value || '—'}</p>}
    </div>
  )
}

export default function DriverProfil() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [driver,   setDriver]   = useState<Driver | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const [form, setForm] = useState({ phone: '', vehiclePlate: '', email: '' })

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'DRIVER') { router.replace('/'); return }
    driverApi.getMe()
      .then(r => {
        setDriver(r.data)
        setForm({ phone: r.data.phone, vehiclePlate: r.data.vehiclePlate || '', email: r.data.email || '' })
      })
      .catch(() => setError('Impossible de charger le profil.'))
      .finally(() => setLoading(false))
  }, [authLoading, user, router])

  const handleExportPdf = async () => {
    if (!driver || exportingPdf) return
    setExportingPdf(true)
    setError('')
    try {
      const { data: rides } = await driverApi.getMyRides()
      await exportDriverCoursesPdf(driver, rides, 'Mes courses')
    } catch {
      setError('Export PDF impossible pour le moment.')
    } finally {
      setExportingPdf(false)
    }
  }

  const handleSave = async () => {
    if (!driver || saving) return
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const { data } = await driverApi.updateMyProfile({
        phone: form.phone || undefined,
        vehiclePlate: form.vehiclePlate || undefined,
        email: form.email || undefined,
      })
      setDriver(data)
      setEditing(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e: any) {
      const msg = e.response?.data?.message
      setError(Array.isArray(msg) ? msg[0] : msg || 'Erreur lors de la sauvegarde.')
    } finally { setSaving(false) }
  }

  const inputCls = [
    'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white',
    'text-sm text-gray-900 placeholder:text-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-colors',
  ].join(' ')

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="animate-spin text-[var(--primary)]" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle className="opacity-20" cx="12" cy="12" r="10"/><path d="M4 12a8 8 0 018-8"/>
        </svg>
      </div>
    )
  }
  if (!driver) return null

  const st = STATUS_CFG[driver.status] || STATUS_CFG.HORS_LIGNE

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-8">

      {/* ── Carte identité ──────────────────────────────────── */}
      <div className="bg-[var(--primary)] rounded-2xl p-5 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-2xl font-extrabold text-white flex-shrink-0">
            {driver.firstName[0]}{driver.lastName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold truncate">{driver.firstName} {driver.lastName}</h1>
            <p className="text-white/60 text-sm mt-0.5">Chauffeur WEND'D Transport</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`w-2 h-2 rounded-full ${st.dot} ${driver.status === 'DISPONIBLE' ? 'animate-pulse' : ''}`} />
              <span className="text-xs font-semibold text-white/80">{st.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Message succès ──────────────────────────────────── */}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          <p className="text-sm text-emerald-700 font-medium">Profil mis à jour avec succès</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── Informations personnelles ───────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[var(--primary)]">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <p className="text-sm font-bold text-gray-900">Informations personnelles</p>
          </div>
          {!editing && (
            <button
              onClick={() => { setEditing(true); setError(''); setSuccess(false) }}
              className="flex items-center gap-1 text-[var(--primary)] text-xs font-semibold hover:underline"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Modifier
            </button>
          )}
        </div>
        <div className="px-4">
          <Row label="Prénom"   value={driver.firstName} />
          <Row label="Nom"      value={driver.lastName} />
          <Row label="Téléphone">
            {editing ? (
              <input className={inputCls + ' max-w-[200px]'} value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+221 77 000 00 00" />
            ) : (
              <a href={`tel:${driver.phone}`} className="text-sm font-semibold text-[var(--primary)]">{driver.phone}</a>
            )}
          </Row>
          <Row label="Email">
            {editing ? (
              <input type="email" className={inputCls + ' max-w-[200px]'} value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@exemple.com" />
            ) : (
              <p className="text-sm font-semibold text-gray-900">{driver.email || '—'}</p>
            )}
          </Row>
        </div>
      </div>

      {/* ── Informations véhicule ───────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[var(--primary)]">
            <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-4h10l2 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/>
            <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
          </svg>
          <p className="text-sm font-bold text-gray-900">Véhicule</p>
        </div>
        <div className="px-4">
          <Row label="Type" value={driver.vehicleType} />
          <Row label="Immatriculation">
            {editing ? (
              <input className={inputCls + ' max-w-[160px]'} value={form.vehiclePlate}
                onChange={e => setForm(f => ({ ...f, vehiclePlate: e.target.value }))}
                placeholder="DK-1234-AA" />
            ) : (
              <p className="text-sm font-bold text-gray-900 font-mono">{driver.vehiclePlate || '—'}</p>
            )}
          </Row>
        </div>
      </div>

      {/* ── Boutons édition ─────────────────────────────────── */}
      {editing && (
        <div className="flex gap-3">
          <button
            onClick={() => { setEditing(false); setError(''); setForm({ phone: driver.phone, vehiclePlate: driver.vehiclePlate || '', email: driver.email || '' }) }}
            className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3.5 rounded-2xl bg-[var(--primary)] text-white text-sm font-bold hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12a8 8 0 018-8"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            )}
            Enregistrer
          </button>
        </div>
      )}

      {/* ── Compte ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[var(--primary)]">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p className="text-sm font-bold text-gray-900">Compte</p>
        </div>
        <div className="px-4">
          <Row label="Email compte" value={user?.email} />
          <Row label="Rôle" value="Chauffeur" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
        <p className="text-sm font-bold text-gray-900">Exporter mes courses (PDF)</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          Télécharge un récapitulatif de toutes vos courses visibles sur votre compte (tous statuts). Les données restent aussi sur le serveur.
        </p>
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={exportingPdf}
          className="w-full py-3 rounded-xl border-2 border-[var(--primary)] text-[var(--primary)] text-sm font-bold hover:bg-[var(--primary)]/5 transition-colors disabled:opacity-50"
        >
          {exportingPdf ? 'Génération…' : 'Télécharger le PDF'}
        </button>
      </div>
    </div>
  )
}
