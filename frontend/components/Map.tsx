'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'

// Fix pour les icônes Leaflet avec Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface MapProps {
  center: [number, number]
  zoom?: number
  markers?: Array<{
    position: [number, number]
    popup?: string
    tooltip?: string
    icon?: 'default' | 'pickup' | 'dropoff' | 'driver'
  }>
  route?: Array<[number, number]>
  className?: string
  autoFollow?: boolean
}

const iconColors = {
  pickup: '#10b981',
  dropoff: '#ef4444',
  driver: '#3b82f6',
  default: '#6b7280',
}

export function Map({ center, zoom = 13, markers = [], route, className = '', autoFollow = false }: MapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.Marker[]>([])
  const routeRef = useRef<L.Polyline | null>(null)
  const [isFollowing, setIsFollowing] = useState(autoFollow)

  useEffect(() => {
    setIsFollowing(autoFollow)
  }, [autoFollow])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: true,
      touchZoom: true,
      scrollWheelZoom: !isMobile(),
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
    } as any)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    // Contrôle zoom en bas à droite
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    mapRef.current = map

    // Drag → désactive le suivi (comme Google Maps)
    map.on('dragstart', () => setIsFollowing(false))

    const handleResize = () => {
      if (mapRef.current) mapRef.current.invalidateSize()
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
      map.remove()
      mapRef.current = null
    }
  }, [])

  function isMobile() {
    return typeof window !== 'undefined' && window.innerWidth < 768
  }

  // Pan smooth si suivi actif, rien si pausé
  useEffect(() => {
    if (!mapRef.current || !isFollowing) return
    mapRef.current.panTo(center, { animate: true, duration: 0.8 })
  }, [center, isFollowing])

  // Marqueurs
  useEffect(() => {
    if (!mapRef.current) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    markers.forEach(({ position, popup, tooltip, icon = 'default' }) => {
      const color = iconColors[icon]
      const markerSize = isMobile() ? 32 : 24

      const html = icon === 'driver'
        ? `<div style="
            width:${markerSize}px;height:${markerSize}px;
            background:${color};border-radius:50%;
            border:3px solid white;
            box-shadow:0 0 0 4px rgba(59,130,246,0.3);
            animation:pulse-driver 1.5s ease-in-out infinite;
          "></div>
          <style>
            @keyframes pulse-driver {
              0%,100%{box-shadow:0 0 0 4px rgba(59,130,246,0.3)}
              50%{box-shadow:0 0 0 8px rgba(59,130,246,0.1)}
            }
          </style>`
        : `<div style="
            background-color:${color};
            width:${markerSize}px;height:${markerSize}px;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            border:2px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,0.4);
          "></div>`

      const customIcon = L.divIcon({
        className: 'custom-marker',
        html,
        iconSize: [markerSize, markerSize],
        iconAnchor: icon === 'driver' ? [markerSize / 2, markerSize / 2] : [markerSize / 2, markerSize],
      })

      const marker = L.marker(position, { icon: customIcon }).addTo(mapRef.current!)
      if (popup) marker.bindPopup(popup)
      if (tooltip) marker.bindTooltip(tooltip, {
        permanent: false, sticky: true, direction: 'top',
        offset: [0, -20], className: 'wendd-tooltip',
      })
      markersRef.current.push(marker)
    })
  }, [markers])

  // Route
  useEffect(() => {
    if (!mapRef.current) return
    if (routeRef.current) { routeRef.current.remove(); routeRef.current = null }

    if (route && route.length > 0) {
      routeRef.current = L.polyline(route, {
        color: '#3b82f6', weight: 5, opacity: 0.8,
      }).addTo(mapRef.current)

      if (!isFollowing) {
        mapRef.current.fitBounds(routeRef.current.getBounds(), { padding: [50, 50] })
      }
    }
  }, [route])

  const recenterOnDriver = () => {
    if (!mapRef.current) return
    mapRef.current.setView(center, zoom, { animate: true })
    setIsFollowing(true)
  }

  return (
    // Hauteur responsive :
    // mobile portrait  (< 640px)  → 45vh  → ~350px sur iPhone
    // mobile paysage / tablette   → 50vh
    // desktop                     → 55vh  → bonne vision sans dominer la page
    // La prop className peut toujours forcer une hauteur fixe si besoin
    <div
      className={`relative w-full rounded-xl overflow-hidden ${className}`}
      style={{ height: 'clamp(260px, 45vh, 480px)' }}
    >
      {/* Carte Leaflet */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 touch-none"
        style={{ zIndex: 0, touchAction: 'manipulation' }}
      />

      {/* ── Bouton Suivi actif / pausé — haut gauche ── */}
      <button
        onClick={() => {
          setIsFollowing(prev => {
            if (!prev && mapRef.current) {
              mapRef.current.panTo(center, { animate: true, duration: 0.6 })
            }
            return !prev
          })
        }}
        className={`
          absolute top-2 left-2 z-[400]
          flex items-center gap-1.5 px-3 py-1.5 rounded-full
          text-xs font-bold shadow-md select-none
          transition-all active:scale-95
          ${isFollowing
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-600 border border-gray-200'
          }
        `}
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isFollowing ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
        {isFollowing ? 'Suivi actif' : 'Suivi pausé'}
      </button>

      {/* ── Bouton recentrer — apparaît quand suivi pausé, au-dessus du zoom ── */}
      {!isFollowing && (
        <button
          onClick={recenterOnDriver}
          className="
            absolute bottom-16 right-2 z-[400]
            w-9 h-9 rounded-xl bg-white shadow-md border border-gray-200
            flex items-center justify-center
            text-blue-600 hover:bg-blue-50
            transition-all active:scale-95
          "
          title="Recentrer sur ma position"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
            <circle cx="12" cy="12" r="7" strokeOpacity="0.3"/>
          </svg>
        </button>
      )}
    </div>
  )
}