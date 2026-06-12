import { Zone } from '../../modules/zones/entities/zone.entity';

const AIRPORT_KEYWORDS = ['aibd', 'aéroport', 'aeroport', 'airport', 'blaise diagne'];

export function textInvolvesAirport(text?: string | null): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return AIRPORT_KEYWORDS.some(kw => lower.includes(kw));
}

export function isAirportTrip(params: {
  pickupZone?: Zone | null;
  dropoffZone?: Zone | null;
  pickupCustomAddress?: string | null;
  dropoffCustomAddress?: string | null;
}): boolean {
  return (
    textInvolvesAirport(params.pickupZone?.name) ||
    textInvolvesAirport(params.dropoffZone?.name) ||
    textInvolvesAirport(params.pickupCustomAddress) ||
    textInvolvesAirport(params.dropoffCustomAddress)
  );
}
