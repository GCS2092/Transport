'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { driverApi, reservationsApi, Driver, Reservation, DriverLocation } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useGeolocation } from '@/hooks/useGeolocation'
import { calculateRoute, formatDuration, formatDistance } from '@/lib/geocoding'
import dynamic from 'next/dynamic'

// Charger la carte dynamiquement pour éviter les erreurs SSR
const Map = dynamic(() => import('@/components/Map').then(mod => ({ default: mod.Map })), {
  ssr: false,
  loading: () => <div className="w-full h-64 bg-gray-100 rounded-xl animate-pulse" />
})

const IconCar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-4h10l2 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/>
    <circle cx="7" cy="17" r="2"/>
    <circle cx="17" cy="17" r="2"/>
  </svg>
)

const IconDollar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
)

const IconMapPin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)

export default function DriverDashboard() {
  const router = useRouter()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [myRides, setMyRides] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState(false)
  const [routeCoordinates, setRouteCoordinates] = useState<Array<[number, number]>>([])
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null)
  
  // Géolocalisation en temps réel (ne démarre pas automatiquement)
  const geolocation = useGeolocation({ watch: true, autoStart: false })

  useEffect(() => {
    loadData()
  }, [])

  // Envoyer la position au backend toutes les 30 secondes
  useEffect(() => {
    if (!driver || !geolocation.latitude || !geolocation.longitude) return
    
    const interval = setInterval(() => {
      driverApi.updateMyLocation({
        latitude: geolocation.latitude!,
        longitude: geolocation.longitude!,
        accuracy: geolocation.accuracy || undefined,
      }).catch(err => console.error('Failed to update location', err))
    }, 30000) // 30 secondes

    // Envoyer immédiatement
    driverApi.updateMyLocation({
      latitude: geolocation.latitude,
      longitude: geolocation.longitude,
      accuracy: geolocation.accuracy || undefined,
    }).catch(err => console.error('Failed to update location', err))

    return () => clearInterval(interval)
  }, [driver, geolocation.latitude, geolocation.longitude])

  const loadData = async () => {
    try {
      const [driverRes, ridesRes] = await Promise.all([
        driverApi.getMe(),
        driverApi.getMyRides(),
      ])
      setDriver(driverRes.data)
      setMyRides(ridesRes.data)
    } catch (err) {
      console.error('Failed to load data', err)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  // Calculer l'itinéraire pour la course en cours (recalcul toutes les 30s)
  useEffect(() => {
    const activeRide = myRides.find(r => r.status === 'EN_COURS')
    if (!activeRide || !geolocation.latitude || !geolocation.longitude) {
      setRouteCoordinates([])
      setRouteInfo(null)
      return
    }

    // Déterminer la destination (pickup ou dropoff selon l'adresse)
    const destLat = activeRide.pickupLatitude || activeRide.pickupZone?.latitude
    const destLng = activeRide.pickupLongitude || activeRide.pickupZone?.longitude

    if (!destLat || !destLng) return

    const updateRoute = () => {
      const lat = geolocation.latitude
      const lng = geolocation.longitude
      if (!lat || !lng) return
      
      calculateRoute(lat, lng, destLat, destLng).then(route => {
        if (route) {
          setRouteCoordinates(route.coordinates)
          setRouteInfo({ distance: route.distance, duration: route.duration })
        }
      })
    }

    // Calcul initial
    updateRoute()

    // Recalculer toutes les 30 secondes pour mettre à jour l'ETA
    const interval = setInterval(updateRoute, 30000)

    return () => clearInterval(interval)
  }, [myRides, geolocation.latitude, geolocation.longitude])

  const handleStatusToggle = async () => {
    if (!driver) return
    setStatusLoading(true)
    try {
      const newStatus = driver.status === 'DISPONIBLE' ? 'HORS_LIGNE' : 'DISPONIBLE'
      await driverApi.updateMyStatus(newStatus)
      setDriver({ ...driver, status: newStatus })
    } catch (err) {
      console.error('Failed to update status', err)
    } finally {
      setStatusLoading(false)
    }
  }

  const handleStartRide = async (reservationId: string) => {
    try {
      await reservationsApi.updateStatus(reservationId, 'EN_COURS')
      loadData()
    } catch (err) {
      console.error('Failed to start ride', err)
    }
  }

  const handleCompleteRide = async (reservationId: string) => {
    try {
      await reservationsApi.updateStatus(reservationId, 'TERMINEE')
      loadData()
    } catch (err) {
      console.error('Failed to complete ride', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    )
  }

  if (!driver) return null

  const assignedRides = myRides.filter(r => r.status === 'ASSIGNEE')
  const activeRide = myRides.find(r => r.status === 'EN_COURS')
  const todayRides = myRides.filter(r => {
    const today = new Date()
    const rideDate = new Date(r.completedAt || r.createdAt)
    return rideDate.toDateString() === today.toDateString() && r.status === 'TERMINEE'
  })
  const todayRevenue = todayRides.reduce((sum, r) => sum + Number(r.amount), 0)

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="max-w-4xl mx-auto px-4 pt-6">
        
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bonjour, {driver.firstName} 👋
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {driver.vehicleType} • {driver.vehiclePlate}
            </p>
          </div>
          
          {/* Toggle statut */}
          <button
            onClick={handleStatusToggle}
            disabled={statusLoading || driver.status === 'EN_COURSE'}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
              driver.status === 'DISPONIBLE'
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : driver.status === 'EN_COURSE'
                ? 'bg-blue-100 text-blue-700 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {driver.status === 'DISPONIBLE' ? '🟢 Disponible' : 
             driver.status === 'EN_COURSE' ? '🔵 En course' : 
             '⚫ Hors ligne'}
          </button>
        </div>

        {/* Demande de permission géolocalisation */}
        {!geolocation.isActive && driver.status !== 'HORS_LIGNE' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-2xl">📍</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Activer la localisation</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Pour que vos clients puissent suivre votre position en temps réel, activez la géolocalisation.
                </p>
                <button
                  onClick={geolocation.requestPermission}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold text-sm hover:bg-amber-700 transition-colors"
                >
                  Activer la localisation
                </button>
              </div>
            </div>
          </div>
        )}

        {geolocation.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-red-700">
              ❌ Erreur de géolocalisation : {geolocation.error}
            </p>
          </div>
        )}

        {/* Stats du jour */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <IconDollar />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Revenus du jour</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(todayRevenue)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <IconCar />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Courses du jour</p>
                <p className="text-xl font-bold text-gray-900">{todayRides.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Course en cours - NAVIGATION */}
        {activeRide && (
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 mb-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">🚗 Navigation en cours</h2>
              <span className="text-xs bg-white/20 px-3 py-1 rounded-full">{activeRide.code}</span>
            </div>

            {/* Infos client */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-base">
                    {activeRide.clientFirstName} {activeRide.clientLastName}
                  </p>
                  <p className="text-xs text-white/80">{activeRide.clientPhone}</p>
                </div>
                <a
                  href={`tel:${activeRide.clientPhone}`}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors"
                >
                  📞 Appeler
                </a>
              </div>
            </div>

            {/* ETA et Distance - GRAND AFFICHAGE */}
            {routeInfo && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-emerald-500 rounded-lg p-4 text-center">
                  <p className="text-xs text-white/80 mb-1">Temps restant</p>
                  <p className="text-3xl font-bold">{formatDuration(routeInfo.duration)}</p>
                </div>
                <div className="bg-white/20 rounded-lg p-4 text-center">
                  <p className="text-xs text-white/80 mb-1">Distance</p>
                  <p className="text-3xl font-bold">{formatDistance(routeInfo.distance)}</p>
                </div>
              </div>
            )}

            {/* Destination */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <IconMapPin />
                <div className="flex-1">
                  <p className="text-xs text-white/70 mb-1">Destination</p>
                  <p className="font-bold">
                    {activeRide.pickupCustomAddress || activeRide.pickupZone?.name || 'Point de départ'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Carte de navigation - PLUS GRANDE */}
            {geolocation.latitude && geolocation.longitude ? (
              <div className="mb-4">
                <Map
                  center={[geolocation.latitude, geolocation.longitude]}
                  zoom={15}
                  markers={[
                    {
                      position: [geolocation.latitude, geolocation.longitude],
                      popup: 'Votre position',
                      icon: 'driver'
                    },
                    ...(activeRide.pickupLatitude && activeRide.pickupLongitude ? [{
                      position: [activeRide.pickupLatitude, activeRide.pickupLongitude] as [number, number],
                      popup: activeRide.pickupCustomAddress || activeRide.pickupZone?.name || 'Point de départ',
                      icon: 'pickup' as const
                    }] : activeRide.pickupZone?.latitude && activeRide.pickupZone?.longitude ? [{
                      position: [activeRide.pickupZone.latitude, activeRide.pickupZone.longitude] as [number, number],
                      popup: activeRide.pickupZone.name,
                      icon: 'pickup' as const
                    }] : [])
                  ]}
                  route={routeCoordinates.length > 0 ? routeCoordinates : undefined}
                  className="h-96 rounded-lg overflow-hidden shadow-lg"
                />
              </div>
            ) : (
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-4">
                <p className="text-sm text-center">
                  ⚠️ Activez la géolocalisation pour voir l'itinéraire
                </p>
              </div>
            )}

            {/* Bouton terminer */}
            <button
              onClick={() => handleCompleteRide(activeRide.id)}
              className="w-full py-4 bg-emerald-500 text-white rounded-lg font-bold text-lg hover:bg-emerald-600 transition-colors shadow-lg"
            >
              ✓ Terminer la course
            </button>
          </div>
        )}

        {/* Courses assignées */}
        {assignedRides.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">
              📋 Courses assignées ({assignedRides.length})
            </h2>
            <div className="space-y-3">
              {assignedRides.map(ride => (
                <div key={ride.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono font-bold text-sm mb-1">{ride.code}</p>
                      <p className="text-sm text-gray-700">
                        {ride.clientFirstName} {ride.clientLastName}
                      </p>
                      <p className="text-xs text-gray-500">{ride.clientPhone}</p>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(ride.amount)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                    <IconMapPin />
                    <span>{ride.pickupZone?.name} → {ride.dropoffZone?.name}</span>
                  </div>
                  
                  <p className="text-xs text-gray-500 mb-3">
                    📅 {new Date(ride.pickupDateTime).toLocaleString('fr-FR')}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/driver/rides/${ride.id}`)}
                      className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                    >
                      📋 Détails
                    </button>
                    <button
                      onClick={() => handleStartRide(ride.id)}
                      className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Démarrer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historique du jour */}
        {todayRides.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-base font-bold text-gray-900 mb-4">
              ✅ Courses terminées aujourd'hui ({todayRides.length})
            </h2>
            <div className="space-y-2">
              {todayRides.map(ride => (
                <div key={ride.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{ride.code}</p>
                    <p className="text-xs text-gray-500">
                      {ride.pickupZone?.name} → {ride.dropoffZone?.name}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">
                    {formatCurrency(ride.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message si aucune course */}
        {assignedRides.length === 0 && !activeRide && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Aucune course assignée pour le moment</p>
            <p className="text-sm text-gray-400 mt-1">
              Assurez-vous d'être en statut "Disponible"
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
