'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { driverApi, Driver, Reservation } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useGeolocation } from '@/hooks/useGeolocation'

const STATUS_DRIVER: Record<string, { label: string; color: string; dot: string }> = {
  DISPONIBLE:  { label: 'Disponible',   color: 'text-emerald-700', dot: 'bg-emerald-500' },
  EN_COURSE:   { label: 'En course',    color: 'text-amber-700',   dot: 'bg-amber-400'  },
  HORS_LIGNE:  { label: 'Hors ligne',   color: 'text-gray-500',    dot: 'bg-gray-400'   },
}

const STATUS_RESA: Record<string, { label: string; color: string; bg: string }> = {
  EN_ATTENTE: { label: 'En attente', color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200'   },
  ASSIGNEE:   { label: 'Assignée',   color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200'     },
  EN_COURS:   { label: 'En cours',   color: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-200' },
  TERMINEE:   { label: 'Terminée',   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200'},
  ANNULEE:    { label: 'Annulée',    color: 'text-red-700',     bg: 'bg-red-50 border-red-200'       },
}

const NEXT_STATUS: Record<string, 'DISPONIBLE' | 'EN_COURSE' | 'HORS_LIGNE'> = {
  DISPONIBLE: 'HORS_LIGNE',
  EN_COURSE:  'DISPONIBLE',
  HORS_LIGNE: 'DISPONIBLE',
}

export default function DriverDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [driver,  setDriver]  = useState<Driver | null>(null)
  const [rides,   setRides]   = useState<Reservation[]>([])
  const [tab,     setTab]     = useState<'today' | 'upcoming' | 'done'>('today')
  const [loading, setLoading] = useState(true)
  const [toggling,setToggling]= useState(false)

  const geo = useGeolocation({ watch: true, autoStart: true })

  // Envoyer la position au backend toutes les 30s quand le chauffeur est actif
  useEffect(() => {
    if (!driver || driver.status === 'HORS_LIGNE') return
    if (!geo.latitude || !geo.longitude) return

    const send = () => driverApi.updateMyLocation({
      latitude: geo.latitude!,
      longitude: geo.longitude!,
      accuracy: geo.accuracy ?? undefined,
    }).catch(() => {})

    send()
    const timer = setInterval(send, 30_000)
    return () => clearInterval(timer)
  }, [driver?.status, geo.latitude, geo.longitude])

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'DRIVER') { router.replace('/'); return }
    Promise.all([
      driverApi.getMe(),
      driverApi.getMyRides(),
    ]).then(([dRes, rRes]) => {
      setDriver(dRes.data)
      setRides(rRes.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [authLoading, user, router])

  const toggleStatus = async () => {
    if (!driver || toggling) return
    const next = NEXT_STATUS[driver.status]
    setToggling(true)
    try {
      const { data } = await driverApi.updateMyStatus(next)
      setDriver(data)
    } finally { setToggling(false) }
  }

  /* Filtrage des courses */
  const today = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const filtered = rides.filter(r => {
    const dt = new Date(r.pickupDateTime)
    if (tab === 'today')    return dt >= today && dt < tomorrow && r.status !== 'TERMINEE' && r.status !== 'ANNULEE'
    if (tab === 'upcoming') return dt >= tomorrow && r.status !== 'TERMINEE' && r.status !== 'ANNULEE'
    return r.status === 'TERMINEE'
  }).sort((a, b) => new Date(a.pickupDateTime).getTime() - new Date(b.pickupDateTime).getTime())

  const todayCount = rides.filter(r => {
    const dt = new Date(r.pickupDateTime); return dt >= today && dt < tomorrow
  }).length
  const doneCount = rides.filter(r => r.status === 'TERMINEE').length

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

  const ds = STATUS_DRIVER[driver.status] || STATUS_DRIVER.HORS_LIGNE

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 pb-6">

      {/* ── Carte profil + statut ─────────────────────────────── */}
      <div className="bg-[var(--primary)] rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-1">Chauffeur</p>
            <h1 className="text-xl font-extrabold">{driver.firstName} {driver.lastName}</h1>
            <p className="text-white/60 text-sm mt-0.5">{driver.vehicleType} · {driver.vehiclePlate}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
            {driver.firstName[0]}{driver.lastName[0]}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${ds.dot} ${driver.status === 'DISPONIBLE' ? 'animate-pulse' : ''}`} />
            <span className="text-sm font-semibold text-white">{ds.label}</span>
          </div>
          <button
            onClick={toggleStatus}
            disabled={toggling}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-colors disabled:opacity-50"
          >
            {toggling ? (
              <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 12a8 8 0 018-8"/></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/></svg>
            )}
            {driver.status === 'HORS_LIGNE' ? 'Me connecter' : driver.status === 'DISPONIBLE' ? 'Pause' : 'Terminer course'}
          </button>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Aujourd'hui", value: todayCount, icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          )},
          { label: 'Terminées', value: doneCount, icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          )},
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Onglets ───────────────────────────────────────────── */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {([['today', "Aujourd'hui"], ['upcoming', 'À venir'], ['done', 'Historique']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Liste courses ─────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <svg className="mx-auto mb-3 text-gray-300" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-4h10l2 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
          <p className="text-sm text-gray-400 font-medium">Aucune course</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ride => {
            const st = STATUS_RESA[ride.status] || STATUS_RESA.EN_ATTENTE
            return (
              <Link key={ride.id} href={`/chauffeur/course/${ride.id}`}
                className="block bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-300 hover:shadow-sm transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-xs font-bold text-gray-400 font-mono">{ride.code}</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{ride.clientFirstName} {ride.clientLastName}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${st.bg} ${st.color} flex-shrink-0`}>
                    {st.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {formatDate(ride.pickupDateTime)}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <span className="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {ride.pickupZone?.name}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                  <span className="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    {ride.dropoffZone?.name}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
