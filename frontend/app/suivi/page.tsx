import type { Metadata } from 'next'
import SuiviPage from './SuiviPage'

export const metadata: Metadata = {
  title: "Suivi de réservation - WEND'D Transport",
  description: "Suivez votre course en temps réel. Entrez votre code de réservation pour voir le statut et la position de votre chauffeur.",
}

export default function Page() {
  return <SuiviPage />
}