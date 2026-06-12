import { Zone } from '@/lib/api'

const AIRPORT_KEYWORDS = ['aibd', 'aéroport', 'aeroport', 'airport', 'blaise diagne']

export function textInvolvesAirport(text?: string | null): boolean {
  if (!text) return false
  const lower = text.toLowerCase()
  return AIRPORT_KEYWORDS.some(kw => lower.includes(kw))
}

export function isAirportTrip(params: {
  pickupZone?: Zone | null
  dropoffZone?: Zone | null
  pickupCustomAddress?: string
  dropoffCustomAddress?: string
  zones?: Zone[]
  pickupZoneId?: string
  dropoffZoneId?: string
}): boolean {
  const pickupZone =
    params.pickupZone ??
    (params.zones && params.pickupZoneId
      ? params.zones.find(z => z.id === params.pickupZoneId)
      : null)
  const dropoffZone =
    params.dropoffZone ??
    (params.zones && params.dropoffZoneId
      ? params.zones.find(z => z.id === params.dropoffZoneId)
      : null)

  return (
    textInvolvesAirport(pickupZone?.name) ||
    textInvolvesAirport(dropoffZone?.name) ||
    textInvolvesAirport(params.pickupCustomAddress) ||
    textInvolvesAirport(params.dropoffCustomAddress)
  )
}

export type LocationInputType = 'zone' | 'custom' | 'gps'

export interface TripPrices {
  ALLER_SIMPLE: number
  RETOUR_SIMPLE: number
  ALLER_RETOUR: number
}

export const DEFAULT_TRIP_PRICES: TripPrices = {
  ALLER_SIMPLE: 30000,
  RETOUR_SIMPLE: 30000,
  ALLER_RETOUR: 40000,
}
