import { Metadata } from 'next'
import AccesClient from './AccesClient'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Accès — WEND\'D Transport',
}

export default function AccesPage() {
  return <AccesClient />
}