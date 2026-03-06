'use client'

import { useEffect, useRef } from 'react'
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

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Initialiser la carte avec options PWA-friendly
    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: !isMobile(), // Cacher le contrôle zoom sur mobile
      attributionControl: true,
      tap: true, // Support tap sur mobile
      touchZoom: true, // Zoom avec pinch
      scrollWheelZoom: !isMobile(), // Désactiver scroll zoom sur mobile pour éviter les conflits
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    // Ajouter un contrôle zoom custom pour mobile
    if (isMobile()) {
      L.control.zoom({
        position: 'bottomright',
      }).addTo(map)
    }

    mapRef.current = map

    // Gérer le redimensionnement pour PWA
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize()
      }
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

  // Helper pour détecter mobile
  function isMobile() {
    return typeof window !== 'undefined' && window.innerWidth < 768
  }

  // Mettre à jour le centre (smooth pan en mode navigation)
  useEffect(() => {
    if (!mapRef.current) return
    if (autoFollow) {
      mapRef.current.panTo(center, { animate: true, duration: 0.8 })
    } else {
      mapRef.current.setView(center, zoom)
    }
  }, [center, zoom, autoFollow])

  // Mettre à jour les marqueurs
  useEffect(() => {
    if (!mapRef.current) return

    // Supprimer les anciens marqueurs
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // Ajouter les nouveaux marqueurs
    markers.forEach(({ position, popup, tooltip, icon = 'default' }) => {
      const color = iconColors[icon]
      const isMobileDevice = isMobile()
      const markerSize = isMobileDevice ? 32 : 24
      
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          background-color: ${color}; 
          width: ${markerSize}px; 
          height: ${markerSize}px; 
          border-radius: 50% 50% 50% 0; 
          transform: rotate(-45deg); 
          border: 2px solid white; 
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          transition: all 0.2s ease;
        "></div>`,
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize/2, markerSize],
      })

      const marker = L.marker(position, { icon: customIcon }).addTo(mapRef.current!)

      if (popup) {
        marker.bindPopup(popup)
      }

      if (tooltip) {
        marker.bindTooltip(tooltip, {
          permanent: false,
          sticky: true,
          direction: 'top',
          offset: [0, -20],
          className: 'wendd-tooltip',
        })
      }

      markersRef.current.push(marker)
    })
  }, [markers])

  // Mettre à jour la route
  useEffect(() => {
    if (!mapRef.current) return

    // Supprimer l'ancienne route
    if (routeRef.current) {
      routeRef.current.remove()
      routeRef.current = null
    }

    // Ajouter la nouvelle route
    if (route && route.length > 0) {
      routeRef.current = L.polyline(route, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.8,
      }).addTo(mapRef.current)

      // En mode navigation (autoFollow), ne pas fitBounds — la vue suit le chauffeur
      if (!autoFollow) {
        mapRef.current.fitBounds(routeRef.current.getBounds(), { padding: [50, 50] })
      }
    }
  }, [route])

  return (
    <div 
      ref={mapContainerRef} 
      className={`w-full h-full min-h-[250px] md:min-h-[300px] rounded-xl overflow-hidden touch-none ${className}`}
      style={{ 
        zIndex: 0,
        // Éviter le scroll sur mobile pendant l'interaction avec la carte
        touchAction: 'manipulation',
      }}
    />
  )
}
