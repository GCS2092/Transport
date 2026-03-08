'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { reservationsApi, driverApi, Reservation } from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useGeolocation } from '@/hooks/useGeolocation'
import { calculateRoute, formatDuration, formatDistance } from '@/lib/geocoding'
import dynamic from 'next/dynamic'

const Map = dynamic(() => import('@/components/Map').then(mod => ({ default: mod.Map })), {
  ssr: false,
  loading: () => <div className="w-full h-56 bg-gray-100 rounded-2xl animate-pulse flex items-center justify-center text-xs text-gray-400">Chargement de la carte…</div>
})

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  EN_ATTENTE: { label: 'En attente', color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200'    },
  ASSIGNEE:   { label: 'Assignée',   color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200'      },
  EN_COURS:   { label: 'En cours',   color: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-200'  },
  TERMINEE:   { label: 'Terminée',   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200'},
  ANNULEE:    { label: 'Annulée',    color: 'text-red-700',     bg: 'bg-red-50 border-red-200'        },
}

const TRIP_LABELS: Record<string, string> = {
  ALLER_SIMPLE:  'Aller simple',
  RETOUR_SIMPLE: 'Retour simple',
  ALLER_RETOUR:  'Aller-retour',
}

function pickupLabel(ride: Reservation): string {
  return ride.pickupCustomAddress || ride.pickupZone?.name || 'Point de départ'
}

function dropoffLabel(ride: Reservation): string {
  return ride.dropoffCustomAddress || ride.dropoffZone?.name || 'Destination'
}

export default function RideDetail() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [ride,    setRide]    = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting,  setActing]  = useState(false)
  const [error,   setError]   = useState('')
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [routeCoords, setRouteCoords] = useState<Array<[number, number]>>([])
  const [routeInfo, setRouteInfo]     = useState<{ distance: number; duration: number } | null>(null)
  const [isHttps,   setIsHttps]       = useState(true)
  const routeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRoutePos  = useRef<{ lat: number; lng: number } | null>(null)

  const geo = useGeolocation({ watch: true, autoStart: true })

  useEffect(() => {
    setIsHttps(window.location.protocol === 'https:' || window.location.hostname === 'localhost')
  }, [])

  // Envoyer la position GPS au backend toutes les 15s (visible admin map)
  useEffect(() => {
    if (!geo.latitude || !geo.longitude) return
    if (!ride || ['TERMINEE', 'ANNULEE'].includes(ride.status)) return

    const send = () => driverApi.updateMyLocation({
      latitude: geo.latitude!,
      longitude: geo.longitude!,
      accuracy: geo.accuracy ?? undefined,
    }).catch(() => {})

    send() // envoi immédiat
    const timer = setInterval(send, 15_000)
    return () => clearInterval(timer)
  }, [geo.latitude, geo.longitude, ride?.status])

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'DRIVER') { router.replace('/'); return }
    reservationsApi.getById(id)
      .then(r => setRide(r.data))
      .catch(() => setError('Course introuvable.'))
      .finally(() => setLoading(false))
  }, [authLoading, user, id, router])

  // Calcul de l'itinéraire avec debounce (15s ou >50m de déplacement)
  useEffect(() => {
    if (!ride || !geo.latitude || !geo.longitude) return
    if (['TERMINEE', 'ANNULEE'].includes(ride.status)) return

    // Choisir la destination selon le statut :
    // ASSIGNEE → aller chercher le client (pickup)
    // EN_COURS → emmener le client (dropoff)
    const isEnCours = ride.status === 'EN_COURS'
    const destLat = isEnCours
      ? (ride.dropoffLatitude ?? ride.dropoffZone?.latitude)
      : (ride.clientLatitude ?? ride.pickupLatitude ?? ride.pickupZone?.latitude)
    const destLng = isEnCours
      ? (ride.dropoffLongitude ?? ride.dropoffZone?.longitude)
      : (ride.clientLongitude ?? ride.pickupLongitude ?? ride.pickupZone?.longitude)

    if (!destLat || !destLng) return

    // Vérifier si on a bougé de plus de 50 m depuis le dernier calcul
    const prev = lastRoutePos.current
    if (prev) {
      const dlat = Math.abs(prev.lat - geo.latitude) * 111000
      const dlng = Math.abs(prev.lng - geo.longitude) * 111000 * Math.cos(geo.latitude * Math.PI / 180)
      const moved = Math.sqrt(dlat * dlat + dlng * dlng)
      if (moved < 50) return  // moins de 50 m → pas besoin de recalculer
    }

    if (routeTimerRef.current) clearTimeout(routeTimerRef.current)
    routeTimerRef.current = setTimeout(() => {
      lastRoutePos.current = { lat: geo.latitude!, lng: geo.longitude! }
      calculateRoute(geo.latitude!, geo.longitude!, destLat, destLng).then(r => {
        if (r) {
          setRouteCoords(r.coordinates)
          setRouteInfo({ distance: r.distance, duration: r.duration })
        }
      })
    }, 800)

    return () => { if (routeTimerRef.current) clearTimeout(routeTimerRef.current) }
  }, [ride, geo.latitude, geo.longitude])

  const updateStatus = async (status: string) => {
    if (!ride || acting) return
    
    // Vérification : ne peut démarrer que si <= 30 min avant l'heure de départ
    if (status === 'EN_COURS') {
      const now = new Date()
      const pickupTime = new Date(ride.pickupDateTime)
      const diffMs = pickupTime.getTime() - now.getTime()
      const diffMinutes = Math.floor(diffMs / 60000)
      
      if (diffMinutes > 30) {
        setError(`Vous ne pouvez démarrer la course que 30 minutes avant l'heure de départ. Il reste encore ${diffMinutes} minutes.`)
        return
      }
    }
    
    // Si on termine la course, demander confirmation du paiement
    if (status === 'TERMINEE' && ride.paymentStatus !== 'PAIEMENT_COMPLET') {
      setPendingStatus(status)
      setShowPaymentConfirm(true)
      return
    }
    
    setActing(true); setError('')
    try {
      const { data } = await reservationsApi.updateStatus(ride.id, status)
      setRide(data)
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur')
    } finally { setActing(false) }
  }

  const confirmCompleteRide = async (markAsPaid: boolean) => {
    if (!ride || !pendingStatus) return
    
    setActing(true); setError('')
    try {
      // Si marqué comme payé, mettre à jour le statut de paiement d'abord
      if (markAsPaid) {
        await reservationsApi.updatePaymentStatus(ride.id, 'PAIEMENT_COMPLET')
      }
      
      // Puis terminer la course
      const { data } = await reservationsApi.updateStatus(ride.id, pendingStatus)
      setRide(data)
      setShowPaymentConfirm(false)
      setPendingStatus(null)
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur')
    } finally { setActing(false) }
  }

  const canStartRide = () => {
    if (!ride) return false
    const now = new Date()
    const pickupTime = new Date(ride.pickupDateTime)
    const diffMs = pickupTime.getTime() - now.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    return diffMinutes <= 30
  }

  const getTimeUntilPickup = () => {
    if (!ride) return ''
    const now = new Date()
    const pickupTime = new Date(ride.pickupDateTime)
    const diffMs = pickupTime.getTime() - now.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMinutes / 60)
    const remainingMinutes = diffMinutes % 60
    
    if (diffMinutes > 0) {
      return `${diffHours > 0 ? diffHours + 'h ' : ''}${remainingMinutes}min`
    }
    return 'Maintenant'
  }

  const updatePaymentStatus = async (paymentStatus: string) => {
    if (!ride || acting) return
    setActing(true); setError('')
    try {
      const { data } = await reservationsApi.updatePaymentStatus(ride.id, paymentStatus)
      setRide(data)
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur lors de la mise à jour du paiement')
    } finally { setActing(false) }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="animate-spin text-[var(--primary)]" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle className="opacity-20" cx="12" cy="12" r="10"/><path d="M4 12a8 8 0 018-8"/>
        </svg>
      </div>
    )
  }

  if (error && !ride) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button onClick={() => router.back()} className="text-[var(--primary)] text-sm font-semibold">← Retour</button>
      </div>
    )
  }

  if (!ride) return null

  const st = STATUS_CFG[ride.status] || STATUS_CFG.EN_ATTENTE

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-8 space-y-4">

      {/* ── Header back + code ────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-base font-extrabold text-gray-900 font-mono">{ride.code}</h1>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${st.bg} ${st.color}`}>
            {st.label}
          </span>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold text-[var(--primary)]">{formatCurrency(ride.amount)}</p>
          <p className="text-[10px] text-gray-400">{TRIP_LABELS[ride.tripType] || ride.tripType}</p>
        </div>
      </div>

      {/* ── Trajet ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Trajet</p>
        <div className="flex items-stretch gap-3">
          <div className="flex flex-col items-center gap-1 pt-1">
            <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="flex-1 w-px bg-gray-200" />
            <span className="w-3 h-3 rounded-full bg-red-400 flex-shrink-0" />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-xs text-gray-400">Départ</p>
              <p className="text-sm font-bold text-gray-900">{pickupLabel(ride)}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {formatDate(ride.pickupDateTime)}
              </p>
            </div>
            <div className="h-px bg-gray-100" />
            <div>
              <p className="text-xs text-gray-400">Destination</p>
              <p className="text-sm font-bold text-gray-900">{dropoffLabel(ride)}</p>
              {ride.returnDateTime && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Retour : {formatDate(ride.returnDateTime)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Carte interactive ─────────────────────────────── */}
      {ride.status !== 'TERMINEE' && ride.status !== 'ANNULEE' && (
        <div className={`bg-white rounded-2xl border p-4 space-y-3 ${ride.status === 'EN_COURS' ? 'border-indigo-200' : 'border-gray-100'}`}>

          {/* Bannière mode navigation */}
          {ride.status === 'EN_COURS' ? (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">Navigation en cours</p>
                <p className="text-xs text-indigo-700 font-semibold truncate">→ {dropoffLabel(ride)}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Carte — Aller chercher le client</p>
              {geo.loading && <p className="text-[10px] text-gray-400">Localisation…</p>}
              {geo.permission === 'denied' && <p className="text-[10px] text-red-500 font-semibold">Localisation refusée</p>}
            </div>
          )}

          {/* ETA + Distance */}
          {routeInfo && (
            <div className="grid grid-cols-2 gap-2">
              <div className={`rounded-xl p-3 text-center text-white ${ride.status === 'EN_COURS' ? 'bg-indigo-600' : 'bg-[var(--primary)]'}`}>
                <p className="text-[10px] opacity-75 mb-0.5">Temps estimé</p>
                <p className="text-xl font-extrabold">{formatDuration(routeInfo.duration)}</p>
              </div>
              <div className="bg-blue-500 rounded-xl p-3 text-center text-white">
                <p className="text-[10px] opacity-75 mb-0.5">Distance restante</p>
                <p className="text-xl font-extrabold">{formatDistance(routeInfo.distance)}</p>
              </div>
            </div>
          )}

          {/* Avertissement HTTPS requis (iOS bloque la géolocalisation sur HTTP) */}
          {!isHttps && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-3 flex items-start gap-2">
              <span className="text-amber-500 text-base flex-shrink-0">⚠️</span>
              <div>
                <p className="text-xs font-bold text-amber-800 mb-0.5">Localisation non disponible</p>
                <p className="text-[11px] text-amber-700 leading-snug">iOS bloque la géolocalisation sur les connexions HTTP. Demandez à votre administrateur de lancer le serveur en HTTPS.</p>
              </div>
            </div>
          )}

          {/* Bouton pour demander la localisation */}
          {isHttps && !geo.latitude && !geo.loading && geo.permission !== 'denied' && (
            <button
              onClick={geo.requestPermission}
              className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 text-xs text-gray-500 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
              📍 Activer ma localisation pour voir la carte
            </button>
          )}

          {/* Carte Leaflet */}
          {geo.latitude && geo.longitude ? (
            <Map
              center={[geo.latitude, geo.longitude]}
              zoom={ride.status === 'EN_COURS' ? 15 : 14}
              autoFollow={ride.status === 'EN_COURS'}
              markers={[
                { position: [geo.latitude, geo.longitude], popup: 'Ma position', icon: 'driver' },
                ...(ride.pickupLatitude && ride.pickupLongitude
                  ? [{ position: [ride.pickupLatitude, ride.pickupLongitude] as [number, number], popup: `📍 ${pickupLabel(ride)}`, icon: 'pickup' as const }]
                  : ride.pickupZone?.latitude && ride.pickupZone?.longitude
                  ? [{ position: [ride.pickupZone.latitude, ride.pickupZone.longitude] as [number, number], popup: `📍 ${pickupLabel(ride)}`, icon: 'pickup' as const }]
                  : []),
                ...(ride.dropoffLatitude && ride.dropoffLongitude
                  ? [{ position: [ride.dropoffLatitude, ride.dropoffLongitude] as [number, number], popup: `🏁 ${dropoffLabel(ride)}`, icon: 'dropoff' as const }]
                  : ride.dropoffZone?.latitude && ride.dropoffZone?.longitude
                  ? [{ position: [ride.dropoffZone.latitude, ride.dropoffZone.longitude] as [number, number], popup: `🏁 ${dropoffLabel(ride)}`, icon: 'dropoff' as const }]
                  : []),
              ]}
              route={routeCoords.length > 0 ? routeCoords : undefined}
              className={`rounded-xl overflow-hidden ${ride.status === 'EN_COURS' ? 'h-72' : 'h-56'}`}
            />
          ) : geo.permission === 'denied' ? (
            <div className="h-40 rounded-xl bg-gray-50 border border-gray-200 flex flex-col items-center justify-center gap-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/><line x1="2" y1="2" x2="22" y2="22" stroke="#ef4444" strokeWidth="2"/></svg>
              <p className="text-xs text-gray-400 text-center px-4">Autorisez la localisation dans les paramètres du navigateur</p>
            </div>
          ) : null}
        </div>
      )}

      {/* ── Client ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Client</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">{ride.clientFirstName} {ride.clientLastName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{ride.clientEmail}</p>
          </div>
          <a href={`tel:${ride.clientPhone}`}
            className="flex items-center gap-1.5 bg-[var(--primary)] text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-[var(--primary-hover)] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 2.1 6.18 2 2 0 0 1 4.11 4h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.09a16 16 0 0 0 6 6"/>
            </svg>
            {ride.clientPhone}
          </a>
        </div>
      </div>

      {/* ── Infos complémentaires ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Détails</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Passagers</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5 flex items-center gap-1">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              {ride.passengers}
            </p>
          </div>
          {ride.flightNumber && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Vol</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{ride.flightNumber}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-semibold">Paiement</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{ride.paymentStatus}</p>
          </div>
        </div>
        {ride.notes && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Notes</p>
            <p className="text-sm text-gray-700">{ride.notes}</p>
          </div>
        )}
      </div>

      {/* ── Erreur action ─────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────── */}
      {ride.status === 'ASSIGNEE' && (
        <div className="space-y-3">
          {!canStartRide() && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-sm text-amber-800 font-semibold">
                ⏰ Départ dans {getTimeUntilPickup()}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Vous ne pourrez démarrer cette course que 30 minutes avant l'heure de prise en charge.
              </p>
            </div>
          )}
          <button
            onClick={() => updateStatus('EN_COURS')}
            disabled={acting || !canStartRide()}
            className="w-full py-4 rounded-2xl bg-[var(--primary)] text-white font-bold text-base hover:bg-[var(--primary-hover)] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {acting ? (
              <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12a8 8 0 018-8"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            )}
            Démarrer la course
          </button>
        </div>
      )}

      {ride.status === 'EN_COURS' && (
        <button
          onClick={() => updateStatus('TERMINEE')}
          disabled={acting}
          className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-base hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {acting ? (
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12a8 8 0 018-8"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          )}
          Terminer la course
        </button>
      )}

      {/* Dialog de confirmation paiement */}
      {showPaymentConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Confirmer le paiement</h3>
              <p className="text-sm text-gray-500 mt-2">
                Le client a-t-il payé la course de {formatCurrency(ride.amount)} ?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => confirmCompleteRide(false)}
                disabled={acting}
                className="py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Non payé
              </button>
              <button
                onClick={() => confirmCompleteRide(true)}
                disabled={acting}
                className="py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60"
              >
                Payé
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center">
              Vous pourrez modifier le statut de paiement plus tard si nécessaire.
            </p>
          </div>
        </div>
      )}

      {/* Bouton pour marquer le paiement comme effectué */}
      {ride.status === 'TERMINEE' && ride.paymentStatus !== 'PAIEMENT_COMPLET' && (
        <button
          onClick={() => updatePaymentStatus('PAIEMENT_COMPLET')}
          disabled={acting}
          className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-base hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {acting ? (
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12a8 8 0 018-8"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          )}
          Confirmer le paiement reçu
        </button>
      )}

      {(ride.status === 'TERMINEE' || ride.status === 'ANNULEE') && (
        <div className={`w-full py-3.5 rounded-2xl text-center text-sm font-bold ${
          ride.status === 'TERMINEE'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-gray-100 text-gray-400 border border-gray-200'
        }`}>
          {ride.status === 'TERMINEE' ? 'Course terminée' : 'Course annulée'}
        </div>
      )}
    </div>
  )
}
