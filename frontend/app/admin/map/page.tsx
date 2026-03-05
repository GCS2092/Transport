'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { adminApi, driverApi } from '@/lib/api'
import dynamic from 'next/dynamic'

const Map = dynamic(() => import('@/components/Map').then(mod => ({ default: mod.Map })), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse" />
})

interface DriverWithLocation {
  id: string
  firstName: string
  lastName: string
  phone: string
  vehicleType: string
  vehiclePlate: string
  status: string
  location?: {
    latitude: number
    longitude: number
    updatedAt: string
  }
  currentRide?: {
    code: string
    clientName: string
    pickup: string
    dropoff: string
    amount: number
  }
}

export default function AdminMapPage() {
  const router = useRouter()
  const [drivers, setDrivers] = useState<DriverWithLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDriver, setSelectedDriver] = useState<DriverWithLocation | null>(null)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DISPONIBLE' | 'EN_COURSE'>('ALL')

  useEffect(() => {
    loadDrivers()
    // Rafraîchir toutes les 10 secondes
    const interval = setInterval(loadDrivers, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadDrivers = async () => {
    try {
      const { data: stats } = await adminApi.getStats()
      
      // Récupérer les chauffeurs actifs avec leurs positions
      const driversWithLocation: DriverWithLocation[] = []
      
      for (const driver of stats.activeDrivers || []) {
        try {
          const { data: location } = await driverApi.getLocation(driver.id)
          driversWithLocation.push({
            ...driver,
            location: location ? {
              latitude: location.latitude,
              longitude: location.longitude,
              updatedAt: location.updatedAt
            } : undefined
          })
        } catch (err) {
          // Chauffeur sans position GPS
          driversWithLocation.push(driver)
        }
      }
      
      setDrivers(driversWithLocation)
    } catch (err) {
      console.error('Failed to load drivers', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredDrivers = statusFilter === 'ALL' 
    ? drivers 
    : drivers.filter(d => d.status === statusFilter)
  
  const availableDrivers = filteredDrivers.filter(d => d.status === 'DISPONIBLE')
  const busyDrivers = filteredDrivers.filter(d => d.status === 'EN_COURSE')
  const driversWithLocation = filteredDrivers.filter(d => d.location)

  // Centre de la carte (Dakar par défaut)
  const mapCenter: [number, number] = driversWithLocation.length > 0 && driversWithLocation[0].location
    ? [driversWithLocation[0].location.latitude, driversWithLocation[0].location.longitude]
    : [14.7167, -17.4677] // Dakar

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🗺️ Carte des chauffeurs</h1>
            <p className="text-sm text-gray-500 mt-1">
              Suivi en temps réel • Mise à jour toutes les 10s
            </p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← Retour
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Filtres par statut */}
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tous ({drivers.length})
              </button>
              <button
                onClick={() => setStatusFilter('DISPONIBLE')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'DISPONIBLE'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Dispo ({drivers.filter(d => d.status === 'DISPONIBLE').length})
              </button>
              <button
                onClick={() => setStatusFilter('EN_COURSE')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'EN_COURSE'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                En course ({drivers.filter(d => d.status === 'EN_COURSE').length})
              </button>
            </div>

            {/* Stats rapides */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-xs text-emerald-600 font-semibold">Disponibles</p>
                <p className="text-2xl font-bold text-emerald-700">{availableDrivers.length}</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-xs text-orange-600 font-semibold">En course</p>
                <p className="text-2xl font-bold text-orange-700">{busyDrivers.length}</p>
              </div>
            </div>

            {/* Liste des chauffeurs */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">
                Chauffeurs actifs ({filteredDrivers.length})
              </h3>
              <div className="space-y-2">
                {filteredDrivers.map(driver => (
                  <button
                    key={driver.id}
                    onClick={() => setSelectedDriver(driver)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedDriver?.id === driver.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-sm text-gray-900">
                          {driver.firstName} {driver.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{driver.vehicleType}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        driver.status === 'DISPONIBLE'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {driver.status === 'DISPONIBLE' ? '🟢 Dispo' : '🔴 En course'}
                      </span>
                    </div>

                    {driver.location ? (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span>
                          Position: {new Date(driver.location.updatedAt).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">📍 Position non disponible</p>
                    )}

                    {driver.currentRide && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs font-mono text-gray-600">{driver.currentRide.code}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {driver.currentRide.pickup} → {driver.currentRide.dropoff}
                        </p>
                      </div>
                    )}
                  </button>
                ))}

                {drivers.length === 0 && !loading && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">Aucun chauffeur actif</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Carte */}
        <div className="flex-1 relative">
          {driversWithLocation.length > 0 ? (
            <Map
              center={mapCenter}
              zoom={12}
              markers={driversWithLocation.map(driver => ({
                position: [driver.location!.latitude, driver.location!.longitude],
                popup: `
                  <div class="text-sm">
                    <p class="font-bold">${driver.firstName} ${driver.lastName}</p>
                    <p class="text-xs text-gray-600">${driver.vehicleType}</p>
                    <p class="text-xs ${driver.status === 'DISPONIBLE' ? 'text-emerald-600' : 'text-orange-600'}">
                      ${driver.status === 'DISPONIBLE' ? '🟢 Disponible' : '🔴 En course'}
                    </p>
                    ${driver.currentRide ? `
                      <div class="mt-1 pt-1 border-t border-gray-200">
                        <p class="text-xs font-mono">${driver.currentRide.code}</p>
                        <p class="text-xs text-gray-500">${driver.currentRide.pickup} → ${driver.currentRide.dropoff}</p>
                      </div>
                    ` : ''}
                  </div>
                `,
                icon: driver.status === 'DISPONIBLE' ? 'driver' : 'driver'
              }))}
              className="h-full"
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <p className="text-gray-500 mb-2">
                  {loading ? '⏳ Chargement...' : '📍 Aucun chauffeur avec position GPS'}
                </p>
                <p className="text-sm text-gray-400">
                  Les chauffeurs doivent activer leur géolocalisation
                </p>
              </div>
            </div>
          )}

          {/* Détails du chauffeur sélectionné */}
          {selectedDriver && (
            <div className="absolute top-4 right-4 bg-white rounded-xl shadow-lg border border-gray-200 p-4 w-80">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">
                    {selectedDriver.firstName} {selectedDriver.lastName}
                  </h3>
                  <p className="text-sm text-gray-600">{selectedDriver.vehicleType}</p>
                  <p className="text-xs text-gray-500">{selectedDriver.vehiclePlate}</p>
                </div>
                <button
                  onClick={() => setSelectedDriver(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <span className="text-sm text-gray-600">Statut</span>
                  <span className={`text-sm font-semibold ${
                    selectedDriver.status === 'DISPONIBLE' ? 'text-emerald-600' : 'text-orange-600'
                  }`}>
                    {selectedDriver.status === 'DISPONIBLE' ? '🟢 Disponible' : '🔴 En course'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <span className="text-sm text-gray-600">Téléphone</span>
                  <a
                    href={`tel:${selectedDriver.phone}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {selectedDriver.phone}
                  </a>
                </div>

                {selectedDriver.location && (
                  <div className="py-2 border-t border-gray-100">
                    <p className="text-sm text-gray-600 mb-1">Position GPS</p>
                    <p className="text-xs text-gray-500">
                      Mise à jour: {new Date(selectedDriver.location.updatedAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                )}

                {selectedDriver.currentRide && (
                  <div className="py-2 border-t border-gray-100">
                    <p className="text-sm text-gray-600 mb-2">Course en cours</p>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="font-mono text-sm font-bold mb-1">
                        {selectedDriver.currentRide.code}
                      </p>
                      <p className="text-xs text-gray-600 mb-1">
                        {selectedDriver.currentRide.clientName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {selectedDriver.currentRide.pickup} → {selectedDriver.currentRide.dropoff}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
