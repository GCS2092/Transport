import type { Metadata } from 'next'
import ZonesTarifsPage from './ZonesTarifsPage'

export const metadata: Metadata = {
  title: "Zones & Tarifs - WEND'D Transport Dakar",
  description: "Tarifs fixes pour vos transferts aéroport à Dakar. Disponible 24h/24.",
}

export default function Page() {
  return <ZonesTarifsPage />
}