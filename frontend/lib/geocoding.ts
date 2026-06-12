// Service de géocodage avec Nominatim (OpenStreetMap - 100% gratuit)
// Limite : 1 requête par seconde (respecter la politique d'usage)

export interface GeocodingResult {
  lat: number
  lng: number
  displayName: string
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

// Cache pour éviter les requêtes répétées
const geocodeCache = new Map<string, GeocodingResult>()
const reverseGeocodeCache = new Map<string, GeocodingResult>()

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse'

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`
  const cached = reverseGeocodeCache.get(cacheKey)
  if (cached) return cached

  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'json',
      addressdetails: '1',
    })

    const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params}`, {
      headers: { 'User-Agent': 'VTC-Dakar-App/1.0' },
    })

    if (!response.ok) return null

    const data = await response.json()
    if (!data?.lat || !data?.lon) return null

    const result: GeocodingResult = {
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lon),
      displayName: data.display_name || `Position GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    }

    reverseGeocodeCache.set(cacheKey, result)
    return result
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  // Vérifier le cache
  const cached = geocodeCache.get(address)
  if (cached) return cached

  try {
    // Ajouter le pays si pas déjà présent (interurbain : Thiès, Saint-Louis, etc.)
    const lower = address.toLowerCase()
    const searchQuery = lower.includes('sénégal') || lower.includes('senegal')
      ? address
      : `${address}, Sénégal`

    const params = new URLSearchParams({
      q: searchQuery,
      format: 'json',
      limit: '1',
      addressdetails: '1',
    })

    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: {
        'User-Agent': 'VTC-Dakar-App/1.0', // Requis par Nominatim
      },
    })

    if (!response.ok) {
      throw new Error('Geocoding failed')
    }

    const data = await response.json()

    if (data.length === 0) {
      return null
    }

    const result: GeocodingResult = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    }

    // Mettre en cache
    geocodeCache.set(address, result)

    return result
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

// Calculer la distance entre deux points (formule de Haversine)
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

// Calculer l'itinéraire avec OSRM (gratuit)
export interface RouteResult {
  coordinates: Array<[number, number]>
  distance: number // en mètres
  duration: number // en secondes
}

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving'

export async function calculateRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<RouteResult | null> {
  try {
    const url = `${OSRM_URL}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('Route calculation failed')
    }

    const data = await response.json()

    if (!data.routes || data.routes.length === 0) {
      return null
    }

    const route = data.routes[0]

    return {
      coordinates: route.geometry.coordinates.map((coord: number[]) => [
        coord[1],
        coord[0],
      ] as [number, number]),
      distance: route.distance,
      duration: route.duration,
    }
  } catch (error) {
    console.error('Route calculation error:', error)
    return null
  }
}

// Formater la durée en texte lisible
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h${mins.toString().padStart(2, '0')}`
}

// Formater la distance en texte lisible
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  const km = (meters / 1000).toFixed(1)
  return `${km} km`
}
