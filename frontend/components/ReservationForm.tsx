'use client'

import { useState, useEffect } from 'react'
import { zonesApi, tariffsApi, reservationsApi, Zone } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

/* ── Icônes SVG inline (lucide-like) ────────────────────────────── */
const IconArrowDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
)
const IconArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
)
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
)
const IconMapPin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
)
const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
)
const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
)
const IconSpinner = () => (
  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor"/><path className="opacity-75" d="M4 12a8 8 0 018-8" stroke="currentColor"/></svg>
)

/* ── Classes communes ────────────────────────────────────────────── */
const inputCls = [
  'w-full px-3.5 py-3 rounded-lg border border-gray-200 bg-white',
  'text-sm text-gray-900 placeholder:text-gray-400',
  'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
  'transition-colors',
].join(' ')
const selectCls = inputCls + ' cursor-pointer appearance-none'

/* ── Composant Field (hors du parent pour éviter le remontage) ── */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

export function ReservationForm() {
  const [step, setStep] = useState(1)
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(false)
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null)
  const { t, lang } = useTranslation()
  const f = t.form
  const [tripType, setTripType] = useState<'ALLER_SIMPLE' | 'RETOUR_SIMPLE' | 'ALLER_RETOUR'>('ALLER_SIMPLE')
  const [success, setSuccess] = useState(false)
  const [reservationCode, setReservationCode] = useState('')
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    clientFirstName: '',
    clientLastName: '',
    clientEmail: '',
    clientPhone: '',
    pickupZoneId: '',
    dropoffZoneId: '',
    pickupDateTime: '',
    returnDateTime: '',
    passengers: 1,
    flightNumber: '',
    notes: '',
  })

  const set = (key: string, val: string | number) =>
    setFormData(prev => ({ ...prev, [key]: val }))

  useEffect(() => { loadZones() }, [])

  useEffect(() => {
    if (formData.pickupZoneId && formData.dropoffZoneId &&
        formData.pickupZoneId !== formData.dropoffZoneId) {
      tariffsApi.getPrice(formData.pickupZoneId, formData.dropoffZoneId)
        .then(r => setEstimatedPrice(r.data.price))
        .catch(() => setEstimatedPrice(null))
    }
  }, [formData.pickupZoneId, formData.dropoffZoneId])

  const loadZones = async () => {
    try {
      const { data } = await zonesApi.getActive()
      setZones(data)
      const aibd = data.find((z: Zone) => z.name.toLowerCase().includes('aibd'))
      const alma = data.find((z: Zone) => z.name.toLowerCase().includes('almad'))
      if (aibd && alma) setFormData(p => ({ ...p, pickupZoneId: aibd.id, dropoffZoneId: alma.id }))
    } catch {}
  }

  const validateStep1 = () => {
    if (!formData.pickupZoneId || !formData.dropoffZoneId) return f.selectZones
    if (formData.pickupZoneId === formData.dropoffZoneId) return f.differentZones
    if (!formData.pickupDateTime) return f.selectDate
    if (tripType === 'ALLER_RETOUR' && !formData.returnDateTime) return f.returnDateRequired
    return ''
  }

  const validateStep2 = () => {
    if (!formData.clientFirstName.trim()) return f.firstNameRequired
    if (!formData.clientLastName.trim()) return f.lastNameRequired
    if (!formData.clientEmail.trim() || !formData.clientEmail.includes('@')) return f.emailInvalid
    if (!formData.clientPhone.trim() || !/^\+[1-9]\d{6,14}$/.test(formData.clientPhone)) return f.phoneInvalid
    return ''
  }

  const handleNext = () => {
    setError('')
    const err = validateStep1()
    if (err) { setError(err); return }
    setStep(2)
  }

  const handleSubmit = async () => {
    setError('')
    const err = validateStep2()
    if (err) { setError(err); return }
    setLoading(true)
    try {
      const payload: any = {
        ...formData,
        tripType,
        passengers: Number(formData.passengers),
        language: lang,
      }
      if (tripType !== 'ALLER_RETOUR') delete payload.returnDateTime
      if (!payload.flightNumber) delete payload.flightNumber
      if (!payload.notes) delete payload.notes
      const { data } = await reservationsApi.create(payload)
      setSuccess(true)
      setReservationCode(data.code)
      localStorage.setItem('vtc_last_code', data.code)
      window.dispatchEvent(new Event('vtc_code_saved'))
    } catch (e: any) {
      const msg = e.response?.data?.message
      setError(Array.isArray(msg) ? msg[0] : msg || f.genericError)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSuccess(false)
    setStep(1)
    setError('')
    setEstimatedPrice(null)
    setFormData({ clientFirstName: '', clientLastName: '', clientEmail: '', clientPhone: '', pickupZoneId: '', dropoffZoneId: '', pickupDateTime: '', returnDateTime: '', passengers: 1, flightNumber: '', notes: '' })
  }

  /* ══════════════════════════════════════════════════════════════
     ÉCRAN DE SUCCÈS
  ══════════════════════════════════════════════════════════════ */
  if (success) {
    return (
      <div className="min-h-[calc(100dvh-7rem)] bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900 text-center mb-1">{f.successTitle}</h2>
          <p className="text-sm text-gray-500 text-center mb-6">{f.successSubtitle} {formData.clientEmail}</p>

          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-center mb-3">{f.bookingCode}</p>
            <p className="text-2xl font-mono font-bold text-center text-gray-900 tracking-widest bg-gray-50 rounded-lg py-3">{reservationCode}</p>
            <p className="text-xs text-gray-400 text-center mt-3">{f.keepCode}</p>
          </div>

          <div className="flex gap-3">
            <a
              href={`/suivi?code=${reservationCode}`}
              className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold text-center hover:bg-[var(--primary-hover)] transition-colors"
            >
              {f.trackBooking}
            </a>
            <button
              onClick={resetForm}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              {f.newBooking}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const pickupName  = zones.find(z => z.id === formData.pickupZoneId)?.name  ?? ''
  const dropoffName = zones.find(z => z.id === formData.dropoffZoneId)?.name ?? ''

  /* ══════════════════════════════════════════════════════════════
     RENDU PRINCIPAL
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-[calc(100dvh-7rem)] bg-gray-50 pb-10">
      <div className="max-w-lg mx-auto px-4 pt-6">

        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">{f.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{f.subtitle}</p>
        </div>

        <div className="flex items-center mb-6">
          {[{ id: 1, label: f.step1 }, { id: 2, label: f.step2 }].map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                  step > s.id  ? 'bg-emerald-500 text-white' :
                  step === s.id ? 'bg-gray-900   text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {step > s.id ? <IconCheck /> : s.id}
                </div>
                <span className={`text-xs font-semibold truncate ${
                  step >= s.id ? 'text-gray-700' : 'text-gray-400'
                }`}>{s.label}</span>
              </div>
              {i < 1 && (
                <div className={`flex-1 h-px mx-3 ${
                  step > 1 ? 'bg-emerald-400' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* ── ÉTAPE 1 : TRAJET ────────────────────────────────── */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

            <div className="p-5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{f.tripType}</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'ALLER_SIMPLE',  label: f.oneWay      },
                  { value: 'RETOUR_SIMPLE', label: f.returnOnly  },
                  { value: 'ALLER_RETOUR',  label: f.roundTrip   },
                ].map(tt => (
                  <button
                    key={tt.value}
                    type="button"
                    onClick={() => setTripType(tt.value as any)}
                    className={`py-2.5 px-2 rounded-lg border text-xs font-semibold transition-all ${
                      tripType === tt.value
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {tt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 border-b border-gray-100 space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{f.itinerary}</p>

              <Field label={f.departure}>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><IconMapPin /></div>
                  <select value={formData.pickupZoneId} onChange={e => set('pickupZoneId', e.target.value)} className={selectCls + ' pl-9'}>
                    <option value="">{f.selectDeparture}</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
              </Field>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-100" />
                <div className="w-7 h-7 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 flex-shrink-0"><IconArrowDown /></div>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <Field label={f.arrival}>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><IconMapPin /></div>
                  <select value={formData.dropoffZoneId} onChange={e => set('dropoffZoneId', e.target.value)} className={selectCls + ' pl-9'}>
                    <option value="">{f.selectArrival}</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
              </Field>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{f.datePassengers}</p>

              <Field label={f.pickupDateTime}>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><IconCalendar /></div>
                  <input type="datetime-local" value={formData.pickupDateTime} onChange={e => set('pickupDateTime', e.target.value)} className={inputCls + ' pl-9'} />
                </div>
              </Field>

              {tripType === 'ALLER_RETOUR' && (
                <Field label={f.returnDateTime}>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><IconCalendar /></div>
                    <input type="datetime-local" value={formData.returnDateTime} onChange={e => set('returnDateTime', e.target.value)} className={inputCls + ' pl-9'} />
                  </div>
                </Field>
              )}

              <Field label={f.passengers}>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><IconUsers /></div>
                  <select value={formData.passengers} onChange={e => set('passengers', parseInt(e.target.value))} className={selectCls + ' pl-9'}>
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <option key={n} value={n}>{n} {n > 1 ? f.passengers_pl : f.passenger}</option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>

            {estimatedPrice && (
              <div className="mx-5 mb-5 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">{f.fixedRate}</p>
                  {pickupName && dropoffName && (
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      {pickupName}
                      <IconArrowRight />
                      {dropoffName}
                    </p>
                  )}
                </div>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(estimatedPrice)}</p>
              </div>
            )}
          </div>
        )}

        {/* ── ÉTAPE 2 : INFORMATIONS + RÉCAP ──────────────────── */}
        {step === 2 && (
          <div className="space-y-3">

            {/* Récap trajet compact */}
            {pickupName && dropoffName && (
              <div className="bg-[var(--primary)] rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/80 text-sm min-w-0">
                  <span className="truncate font-medium text-white">{pickupName}</span>
                  <span className="flex-shrink-0 text-white/60"><IconArrowRight /></span>
                  <span className="truncate font-medium text-white">{dropoffName}</span>
                </div>
                {estimatedPrice && (
                  <span className="text-emerald-300 font-bold text-sm flex-shrink-0 ml-3">{formatCurrency(estimatedPrice)}</span>
                )}
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{f.yourDetails}</p>

              <div className="grid grid-cols-2 gap-3">
                <Field label={f.firstName}>
                  <input type="text" value={formData.clientFirstName} onChange={e => set('clientFirstName', e.target.value)} className={inputCls} placeholder="Moussa" />
                </Field>
                <Field label={f.lastName}>
                  <input type="text" value={formData.clientLastName} onChange={e => set('clientLastName', e.target.value)} className={inputCls} placeholder="Diallo" />
                </Field>
              </div>

              <Field label={f.emailField}>
                <input type="email" value={formData.clientEmail} onChange={e => set('clientEmail', e.target.value)} className={inputCls} placeholder="moussa@gmail.com" />
              </Field>

              <Field label={f.phoneField} hint={f.phoneHint}>
                <input type="tel" value={formData.clientPhone} onChange={e => set('clientPhone', e.target.value)} className={inputCls} placeholder="+221 77 123 45 67" />
              </Field>

              <Field label={f.flightNumber}>
                <input type="text" value={formData.flightNumber} onChange={e => set('flightNumber', e.target.value)} className={inputCls} placeholder="AF718" />
              </Field>

              <Field label={f.notes}>
                <textarea value={formData.notes} onChange={e => set('notes', e.target.value)} className={inputCls + ' resize-none'} placeholder={f.notesPlaceholder} rows={2} />
              </Field>
            </div>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <svg className="flex-shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-4">
          {step === 2 && (
            <button
              type="button"
              onClick={() => { setStep(1); setError('') }}
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              {f.back}
            </button>
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 active:bg-gray-950 transition-colors"
            >
              {f.continue}
              <IconArrowRight />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <><IconSpinner /> {f.sending}</> : f.confirm}
            </button>
          )}
        </div>

        <p className="text-xs text-center text-gray-400 mt-3">{f.footer}</p>

      </div>
    </div>
  )
}
