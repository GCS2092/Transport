'use client'

import { useState, useEffect, useRef } from 'react'
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

// Clé de cache: lat/lon arrondis à 3 décimales (~110m)
function cacheKey(lat: number | string, lon: number | string) {
  return `${Number(lat).toFixed(3)},${Number(lon).toFixed(3)}`
}

export default function AdminMapPage() {
  const router = useRouter()
  const [drivers, setDrivers] = useState<DriverWithLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDriver, setSelectedDriver] = useState<DriverWithLocation | null>(null)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DISPONIBLE' | 'EN_COURSE'>('ALL')
  const [neighborhoods, setNeighborhoods] = useState<Record<string, string>>({})
  const [showSidebar, setShowSidebar] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const geocache = useRef<Record<string, string>>({}) // cache: cacheKey → neighborhood label

  // Détecter mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setShowSidebar(false)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    loadDrivers()
    // Rafraîchir toutes les 10 secondes
    const interval = setInterval(loadDrivers, 10000)
    return () => clearInterval(interval)
  }, [])

  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    const key = cacheKey(lat, lon)
    if (geocache.current[key]) return geocache.current[key]
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=fr`,
        { headers: { 'User-Agent': 'WENDD-Transport/1.0' } }
      )
      const data = await res.json()
      const a = data.address || {}
      const label = a.suburb || a.neighbourhood || a.quarter || a.city_district || a.town || a.village || a.city || 'Zone inconnue'
      geocache.current[key] = label
      return label
    } catch {
      return 'Zone inconnue'
    }
  }

  const loadDrivers = async () => {
    try {
      const { data: stats } = await adminApi.getStats()
      
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
        } catch {
          driversWithLocation.push(driver)
        }
      }
      
      setDrivers(driversWithLocation)

      // Reverse geocoding en parallèle pour les chauffeurs avec position
      const updates: Record<string, string> = {}
      await Promise.all(
        driversWithLocation
          .filter(d => d.location)
          .map(async d => {
            const label = await reverseGeocode(d.location!.latitude, d.location!.longitude)
            updates[d.id] = label
          })
      )
      if (Object.keys(updates).length > 0) {
        setNeighborhoods(prev => ({ ...prev, ...updates }))
      }
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
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            </button>
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-gray-900">🗺️ Carte des chauffeurs</h1>
              <p className="text-xs md:text-sm text-gray-500 mt-1">
                Suivi en temps réel • Mise à jour toutes les 10s
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="px-3 md:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            ← Retour
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] relative">
        {/* Sidebar - Overlay sur mobile */}
        {(showSidebar || !isMobile) && (
          <>
            {/* Overlay mobile */}
            {isMobile && showSidebar && (
              <div 
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setShowSidebar(false)}
              />
            )}
            
            {/* Sidebar */}
            <div className={`${
              isMobile 
                ? 'fixed left-0 top-16 bottom-0 w-80 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300'
                : 'w-80 bg-white border-r border-gray-200 overflow-y-auto'
            } ${
              isMobile && !showSidebar ? '-translate-x-full' : 'translate-x-0'
            }`}>
              <div className="p-4 space-y-4">
                {/* Header mobile */}
                {isMobile && (
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Chauffeurs</h3>
                    <button
                      onClick={() => setShowSidebar(false)}
                      className="p-2 rounded-lg hover:bg-gray-100"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                )}
                {/* Filtres par statut */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`flex-1 py-2 px-2 md:px-3 rounded-lg text-xs font-semibold transition-all ${
                      statusFilter === 'ALL'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="hidden md:inline">Tous</span>
                    <span className="md:hidden">All</span>
                    ({drivers.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('DISPONIBLE')}
                    className={`flex-1 py-2 px-2 md:px-3 rounded-lg text-xs font-semibold transition-all ${
                      statusFilter === 'DISPONIBLE'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="hidden md:inline">Dispo</span>
                    <span className="md:hidden">🟢</span>
                    ({drivers.filter(d => d.status === 'DISPONIBLE').length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('EN_COURSE')}
                    className={`flex-1 py-2 px-2 md:px-3 rounded-lg text-xs font-semibold transition-all ${
                      statusFilter === 'EN_COURSE'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="hidden md:inline">Course</span>
                    <span className="md:hidden">🔴</span>
                    ({drivers.filter(d => d.status === 'EN_COURSE').length})
                  </button>
                </div>

                {/* Stats rapides */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <p className="text-xs text-emerald-600 font-semibold">Disponibles</p>
                    <p className="text-xl md:text-2xl font-bold text-emerald-700">{availableDrivers.length}</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-xs text-orange-600 font-semibold">En course</p>
                    <p className="text-xl md:text-2xl font-bold text-orange-700">{busyDrivers.length}</p>
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
        )}

        {/* Carte */}
        <div className="flex-1 relative">
          {driversWithLocation.length > 0 ? (
            <Map
              center={mapCenter}
              zoom={12}
              markers={driversWithLocation.map(driver => {
                const zone = neighborhoods[driver.id]
                const statusColor = driver.status === 'DISPONIBLE' ? '#16a34a' : '#ea580c'
                const statusLabel = driver.status === 'DISPONIBLE' ? '🟢 Disponible' : '🔴 En course'
                const updatedAt = driver.location?.updatedAt
                  ? new Date(driver.location.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  : ''

                return {
                  position: [driver.location!.latitude, driver.location!.longitude] as [number, number],
                  tooltip: `
                    <div style="font-family:system-ui,sans-serif;min-width:170px;line-height:1.5">
                      <div style="font-weight:700;font-size:13px;margin-bottom:2px">${driver.firstName} ${driver.lastName}</div>
                      <div style="font-size:11px;color:#6b7280">${driver.vehicleType} · ${driver.vehiclePlate}</div>
                      <div style="font-size:11px;color:${statusColor};margin-top:3px">${statusLabel}</div>
                      ${zone ? `<div style="font-size:11px;color:#374151;margin-top:4px">📍 ${zone}</div>` : ''}
                      ${updatedAt ? `<div style="font-size:10px;color:#9ca3af;margin-top:2px">Mis à jour ${updatedAt}</div>` : ''}
                      ${driver.currentRide ? `<div style="font-size:11px;color:#6b7280;margin-top:4px;padding-top:4px;border-top:1px solid #e5e7eb">${driver.currentRide.pickup} → ${driver.currentRide.dropoff}</div>` : ''}
                    </div>
                  `,
                  popup: `
                    <div style="font-family:system-ui,sans-serif;font-size:13px">
                      <p style="font-weight:700;margin:0 0 4px">${driver.firstName} ${driver.lastName}</p>
                      <p style="font-size:11px;color:#6b7280;margin:0 0 2px">${driver.vehicleType} · ${driver.vehiclePlate}</p>
                      <p style="font-size:11px;color:${statusColor};margin:0">${statusLabel}</p>
                      ${zone ? `<p style="font-size:11px;color:#374151;margin:4px 0 0">📍 ${zone}</p>` : ''}
                      ${driver.currentRide ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280">${driver.currentRide.pickup} → ${driver.currentRide.dropoff}</div>` : ''}
                    </div>
                  `,
                  icon: 'driver' as const,
                }
              })}
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

          {/* Détails du chauffeur sélectionné - Responsive */}
          {selectedDriver && (
            <div className={`${
              isMobile 
                ? 'fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg border border-gray-200 z-50 max-h-[70vh] overflow-y-auto'
                : 'absolute top-4 right-4 bg-white rounded-xl shadow-lg border border-gray-200 p-4 w-80'
            }`}>
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
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
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
