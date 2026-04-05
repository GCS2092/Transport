import type { Metadata } from 'next'
import ContactPage from './ContactPage'

export const metadata: Metadata = {
  title: "Contact - WEND'D Transport Dakar",
  description: "Contactez WEND'D Transport par téléphone, WhatsApp ou email. Disponible 24h/24.",
}

export default function Page() {
  return <ContactPage />
}