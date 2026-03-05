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

    // Initialiser la carte
    const map = L.map(mapContainerRef.current).setView(center, zoom)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

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
    markers.forEach(({ position, popup, icon = 'default' }) => {
      const color = iconColors[icon]
      
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      })

      const marker = L.marker(position, { icon: customIcon }).addTo(mapRef.current!)
      
      if (popup) {
        marker.bindPopup(popup)
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
      className={`w-full h-full min-h-[300px] rounded-xl overflow-hidden ${className}`}
      style={{ zIndex: 0 }}
    />
  )
}
