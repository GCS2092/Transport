'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { reservationsApi, Reservation } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useGeolocation } from '@/hooks/useGeolocation'
import { calculateRoute, formatDuration, formatDistance } from '@/lib/geocoding'
import dynamic from 'next/dynamic'

const Map = dynamic(() => import('@/components/Map').then(mod => ({ default: mod.Map })), {
  ssr: false,
  loading: () => <div className="w-full h-96 bg-gray-100 rounded-xl animate-pulse" />
})

const IconMapPin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)

const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

export default function RideDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [ride, setRide] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [routeCoordinates, setRouteCoordinates] = useState<Array<[number, number]>>([])
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null)
  const geolocation = useGeolocation({ watch: true, autoStart: true })

  useEffect(() => {
    loadRide()
  }, [params.id])

  // Calculer l'itinéraire si on a la géolocalisation
  useEffect(() => {
    if (!ride || !geolocation.latitude || !geolocation.longitude) {
      setRouteCoordinates([])
      setRouteInfo(null)
      return
    }

    const destLat = ride.pickupLatitude || ride.pickupZone?.latitude
    const destLng = ride.pickupLongitude || ride.pickupZone?.longitude

    if (!destLat || !destLng) return

    calculateRoute(
      geolocation.latitude,
      geolocation.longitude,
      destLat,
      destLng
    ).then(route => {
      if (route) {
        setRouteCoordinates(route.coordinates)
        setRouteInfo({ distance: route.distance, duration: route.duration })
      }
    })
  }, [ride, geolocation.latitude, geolocation.longitude])

  const loadRide = async () => {
    try {
      const { data } = await reservationsApi.getById(params.id as string)
      setRide(data)
    } catch (err) {
      console.error('Failed to load ride', err)
      router.push('/driver/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleStartRide = async () => {
    if (!ride) return
    try {
      await reservationsApi.updateStatus(ride.id, 'EN_COURS')
      router.push('/driver/dashboard')
    } catch (err) {
      console.error('Failed to start ride', err)
    }
  }

  const handleCompleteRide = async () => {
    if (!ride) return
    try {
      await reservationsApi.updateStatus(ride.id, 'TERMINEE')
      router.push('/driver/dashboard')
    } catch (err) {
      console.error('Failed to complete ride', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!ride) return null

  const statusColors = {
    EN_ATTENTE: 'bg-yellow-100 text-yellow-700',
    ASSIGNEE: 'bg-blue-100 text-blue-700',
    EN_COURS: 'bg-emerald-100 text-emerald-700',
    TERMINEE: 'bg-gray-100 text-gray-700',
    ANNULEE: 'bg-red-100 text-red-700',
  }

  const statusLabels = {
    EN_ATTENTE: 'En attente',
    ASSIGNEE: 'Assignée',
    EN_COURS: 'En cours',
    TERMINEE: 'Terminée',
    ANNULEE: 'Annulée',
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto px-4 pt-6">
        
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/driver/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Retour au dashboard
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{ride.code}</h1>
              <p className="text-sm text-gray-500 mt-1">Détails de la course</p>
            </div>
            <span className={`px-4 py-2 rounded-lg font-semibold text-sm ${statusColors[ride.status]}`}>
              {statusLabels[ride.status]}
            </span>
          </div>
        </div>

        {/* Carte avec itinéraire */}
        {ride.status !== 'TERMINEE' && ride.status !== 'ANNULEE' && geolocation.latitude && geolocation.longitude && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">🗺️ Itinéraire</h2>
            
            {/* ETA et Distance */}
            {routeInfo && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-emerald-500 rounded-lg p-4 text-center text-white">
                  <p className="text-xs opacity-80 mb-1">Temps estimé</p>
                  <p className="text-2xl font-bold">{formatDuration(routeInfo.duration)}</p>
                </div>
                <div className="bg-blue-500 rounded-lg p-4 text-center text-white">
                  <p className="text-xs opacity-80 mb-1">Distance</p>
                  <p className="text-2xl font-bold">{formatDistance(routeInfo.distance)}</p>
                </div>
              </div>
            )}

            <Map
              center={[geolocation.latitude, geolocation.longitude]}
              zoom={14}
              markers={[
                {
                  position: [geolocation.latitude, geolocation.longitude],
                  popup: 'Votre position',
                  icon: 'driver'
                },
                ...(ride.pickupLatitude && ride.pickupLongitude ? [{
                  position: [ride.pickupLatitude, ride.pickupLongitude] as [number, number],
                  popup: ride.pickupCustomAddress || ride.pickupZone?.name || 'Point de départ',
                  icon: 'pickup' as const
                }] : ride.pickupZone?.latitude && ride.pickupZone?.longitude ? [{
                  position: [ride.pickupZone.latitude, ride.pickupZone.longitude] as [number, number],
                  popup: ride.pickupZone.name,
                  icon: 'pickup' as const
                }] : [])
              ]}
              route={routeCoordinates.length > 0 ? routeCoordinates : undefined}
              className="h-96 rounded-lg overflow-hidden"
            />
          </div>
        )}

        {/* Informations client */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">👤 Client</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Nom complet</p>
              <p className="text-base font-semibold text-gray-900">
                {ride.clientFirstName} {ride.clientLastName}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Téléphone</p>
              <a href={`tel:${ride.clientPhone}`} className="text-base font-semibold text-blue-600 hover:underline">
                {ride.clientPhone}
              </a>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Email</p>
              <p className="text-base text-gray-900">{ride.clientEmail}</p>
            </div>
          </div>
        </div>

        {/* Détails du trajet */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">🚗 Trajet</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <IconMapPin />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Départ</p>
                <p className="text-base font-semibold text-gray-900">
                  {ride.pickupCustomAddress || ride.pickupZone?.name || 'Adresse personnalisée'}
                </p>
                {ride.pickupLatitude && ride.pickupLongitude && (
                  <p className="text-xs text-gray-400 mt-1">
                    📍 {ride.pickupLatitude.toFixed(6)}, {ride.pickupLongitude.toFixed(6)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <IconMapPin />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Arrivée</p>
                <p className="text-base font-semibold text-gray-900">
                  {ride.dropoffCustomAddress || ride.dropoffZone?.name || 'Adresse personnalisée'}
                </p>
                {ride.dropoffLatitude && ride.dropoffLongitude && (
                  <p className="text-xs text-gray-400 mt-1">
                    📍 {ride.dropoffLatitude.toFixed(6)}, {ride.dropoffLongitude.toFixed(6)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <IconCalendar />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Date et heure</p>
                <p className="text-base font-semibold text-gray-900">
                  {new Date(ride.pickupDateTime).toLocaleString('fr-FR', {
                    dateStyle: 'full',
                    timeStyle: 'short'
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <IconUsers />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Passagers</p>
                <p className="text-base font-semibold text-gray-900">
                  {ride.passengers} {ride.passengers > 1 ? 'personnes' : 'personne'}
                </p>
              </div>
            </div>

            {ride.flightNumber && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                  ✈️
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Numéro de vol</p>
                  <p className="text-base font-semibold text-gray-900">{ride.flightNumber}</p>
                </div>
              </div>
            )}

            {ride.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700 font-semibold mb-1">📝 Notes du client</p>
                <p className="text-sm text-gray-700">{ride.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Montant */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">Montant de la course</p>
              <p className="text-3xl font-bold">{formatCurrency(ride.amount)}</p>
              {ride.discount && ride.discount > 0 && (
                <p className="text-xs opacity-75 mt-1">
                  Réduction : {formatCurrency(ride.discount)} (Code: {ride.promoCode})
                </p>
              )}
            </div>
            <div className="text-5xl opacity-20">💰</div>
          </div>
        </div>

        {/* Actions */}
        {ride.status === 'ASSIGNEE' && (
          <button
            onClick={handleStartRide}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            🚗 Démarrer la course
          </button>
        )}

        {ride.status === 'EN_COURS' && (
          <button
            onClick={handleCompleteRide}
            className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition-colors shadow-lg"
          >
            ✓ Terminer la course
          </button>
        )}

      </div>
    </div>
  )
}
