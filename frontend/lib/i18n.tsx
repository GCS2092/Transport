'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'fr' | 'en'

/* ══════════════════════════════════════════════════════════════
   DICTIONNAIRE FR / EN
══════════════════════════════════════════════════════════════ */
export const T = {
  fr: {
    nav: {
      reserve: 'Réserver', track: 'Suivi', prices: 'Tarifs', contact: 'Contact',
      noBooking: 'Aucune réservation', signIn: 'Se connecter', signOut: 'Déconnexion',
      myAccount: 'Mon compte',
    },
    auth: {
      title: 'Se connecter', subtitle: 'Accédez à votre espace',
      email: 'Adresse email', password: 'Mot de passe',
      submit: 'Se connecter', loading: 'Connexion…',
      error: 'Email ou mot de passe incorrect', close: 'Fermer',
    },
    form: {
      title: 'Réserver un transfert',
      subtitle: 'Confirmation immédiate par email — tarif fixe garanti',
      step1: 'Votre trajet', step2: 'Vos informations',
      tripType: 'Type de trajet',
      oneWay: 'Aller simple', returnOnly: 'Retour simple', roundTrip: 'Aller-retour',
      itinerary: 'Itinéraire', departure: 'Départ', arrival: 'Arrivée',
      selectDeparture: 'Sélectionner la zone de départ',
      selectArrival: "Sélectionner la zone d'arrivée",
      datePassengers: 'Date & Passagers',
      pickupDateTime: 'Date et heure de prise en charge',
      returnDateTime: 'Date et heure de retour',
      passengers: 'Nombre de passagers', passenger: 'passager', passengers_pl: 'passagers',
      fixedRate: 'Tarif fixe garanti',
      continue: 'Continuer', back: 'Retour',
      yourDetails: 'Vos coordonnées',
      firstName: 'Prénom', lastName: 'Nom',
      emailField: 'Adresse email', phoneField: 'Téléphone',
      phoneHint: 'Format international : +221 77 123 45 67',
      flightNumber: 'Numéro de vol (optionnel)',
      notes: 'Notes pour le chauffeur (optionnel)',
      notesPlaceholder: "2 bagages, besoin d'un siège enfant…",
      confirm: 'Confirmer la réservation', sending: 'Envoi en cours…',
      footer: 'Confirmation immédiate par email · Annulation gratuite 24h avant',
      successTitle: 'Réservation confirmée',
      successSubtitle: 'Un email de confirmation a été envoyé à',
      bookingCode: 'Code de réservation',
      keepCode: 'Conservez ce code pour suivre et gérer votre réservation',
      trackBooking: 'Suivre ma réservation', newBooking: 'Nouvelle réservation',
      selectZones: 'Veuillez sélectionner les deux zones',
      differentZones: "Les zones de départ et d'arrivée doivent être différentes",
      selectDate: 'Veuillez choisir une date et heure de prise en charge',
      returnDateRequired: 'Date de retour requise',
      firstNameRequired: 'Prénom requis', lastNameRequired: 'Nom requis',
      emailInvalid: 'Adresse email invalide',
      phoneInvalid: 'Téléphone invalide — format +221…',
      genericError: 'Une erreur est survenue. Veuillez réessayer.',
    },
    track: {
      title: 'Suivi de réservation',
      subtitle: 'Retrouvez les détails de votre course',
      placeholder: 'Ex : VTC-TEST1', search: 'Chercher', searching: '…',
      notFound: 'Réservation introuvable. Vérifiez le code.',
      bookingCode: 'Code de réservation',
      trip: 'Trajet', departure: 'Départ', arrival: 'Arrivée',
      fixedRate: 'Tarif fixe garanti',
      dateTime: 'Date & Heure', passengers: 'Passagers', type: 'Type',
      payment: 'Paiement', paid: 'Payé', pending: 'En attente',
      driver: 'Votre chauffeur', call: 'Appeler', notes: 'Notes',
      cancel: 'Annuler cette réservation',
      confirmCancel: "Confirmer l'annulation",
      cancelToken: "Code d'annulation (reçu par email)",
      cancelTokenHint: 'Ex : AB3K9P',
      back: 'Retour', confirm: 'Confirmer',
      cancelError: "Erreur lors de l'annulation",
    },
    zones: {
      title: 'Zones & Tarifs', subtitle: 'Tarifs fixes garantis, aucune surprise',
      calculate: 'Calculer un tarif', from: 'Zone de départ', to: "Zone d'arrivée",
      select: 'Sélectionner', different: 'Veuillez sélectionner deux zones différentes',
      calculating: 'Calcul en cours…', fixedRate: 'Tarif fixe garanti',
      bookTrip: 'Réserver ce trajet →',
      advantages: [
        { title: 'Prix fixes', desc: 'Aucune surprise' },
        { title: 'Premium',    desc: 'Véhicules modernes' },
        { title: '24h / 24',   desc: 'Tous les jours' },
      ],
      zonesTitle: 'Zones desservies', zonesCount: 'zones disponibles 24h/24', active: 'Actif',
    },
    contact: {
      title: 'Nous contacter', subtitle: 'Équipe disponible 24h/24 pour vous aider',
      phoneSub: '24h/24, 7j/7', whatsappSub: 'Réponse immédiate',
      emailSub: 'Réponse sous 24h', addressSub: 'Service dans toute la région',
      faqTitle: 'Questions fréquentes', cta: 'Réserver un transfert →',
      faq: [
        { q: 'Comment réserver ?',                a: "Remplissez le formulaire en 2 étapes sur la page d'accueil. Confirmation immédiate par email avec votre code VTC." },
        { q: 'Puis-je annuler ma réservation ?',   a: "Oui, annulation gratuite jusqu'à 24h avant la prise en charge. Utilisez le token reçu par email." },
        { q: 'Les prix sont-ils fixes ?',           a: 'Absolument. Pas de surprise, le prix affiché est le prix final, sans frais cachés.' },
        { q: 'Quels moyens de paiement ?',          a: 'Espèces, carte bancaire et mobile money (Wave, Orange Money).' },
        { q: "Couvrez-vous l'aéroport AIBD ?",      a: 'Oui, transferts depuis et vers AIBD 24h/24, 7j/7.' },
      ],
    },
  },

  en: {
    nav: {
      reserve: 'Book', track: 'Track', prices: 'Prices', contact: 'Contact',
      noBooking: 'No booking yet', signIn: 'Sign in', signOut: 'Sign out',
      myAccount: 'My account',
    },
    auth: {
      title: 'Sign in', subtitle: 'Access your space',
      email: 'Email address', password: 'Password',
      submit: 'Sign in', loading: 'Signing in…',
      error: 'Incorrect email or password', close: 'Close',
    },
    form: {
      title: 'Book a transfer',
      subtitle: 'Immediate email confirmation — fixed rate guaranteed',
      step1: 'Your trip', step2: 'Your details',
      tripType: 'Trip type',
      oneWay: 'One way', returnOnly: 'Return only', roundTrip: 'Round trip',
      itinerary: 'Route', departure: 'Departure', arrival: 'Arrival',
      selectDeparture: 'Select departure zone',
      selectArrival: 'Select arrival zone',
      datePassengers: 'Date & Passengers',
      pickupDateTime: 'Pickup date and time',
      returnDateTime: 'Return date and time',
      passengers: 'Number of passengers', passenger: 'passenger', passengers_pl: 'passengers',
      fixedRate: 'Fixed rate guaranteed',
      continue: 'Continue', back: 'Back',
      yourDetails: 'Your contact details',
      firstName: 'First name', lastName: 'Last name',
      emailField: 'Email address', phoneField: 'Phone',
      phoneHint: 'International format: +221 77 123 45 67',
      flightNumber: 'Flight number (optional)',
      notes: 'Notes for the driver (optional)',
      notesPlaceholder: '2 bags, need a child seat…',
      confirm: 'Confirm booking', sending: 'Sending…',
      footer: 'Immediate email confirmation · Free cancellation 24h before',
      successTitle: 'Booking confirmed',
      successSubtitle: 'A confirmation email has been sent to',
      bookingCode: 'Booking code',
      keepCode: 'Keep this code to track and manage your booking',
      trackBooking: 'Track my booking', newBooking: 'New booking',
      selectZones: 'Please select both zones',
      differentZones: 'Departure and arrival zones must be different',
      selectDate: 'Please choose a pickup date and time',
      returnDateRequired: 'Return date required',
      firstNameRequired: 'First name required', lastNameRequired: 'Last name required',
      emailInvalid: 'Invalid email address',
      phoneInvalid: 'Invalid phone — format +221…',
      genericError: 'An error occurred. Please try again.',
    },
    track: {
      title: 'Track booking',
      subtitle: 'Find the details of your ride',
      placeholder: 'Ex: VTC-TEST1', search: 'Search', searching: '…',
      notFound: 'Booking not found. Check the code.',
      bookingCode: 'Booking code',
      trip: 'Trip', departure: 'Departure', arrival: 'Arrival',
      fixedRate: 'Fixed rate guaranteed',
      dateTime: 'Date & Time', passengers: 'Passengers', type: 'Type',
      payment: 'Payment', paid: 'Paid', pending: 'Pending',
      driver: 'Your driver', call: 'Call', notes: 'Notes',
      cancel: 'Cancel this booking',
      confirmCancel: 'Confirm cancellation',
      cancelToken: 'Cancellation token',
      cancelTokenHint: 'Enter the token received by email',
      back: 'Back', confirm: 'Confirm',
      cancelError: 'Error during cancellation',
    },
    zones: {
      title: 'Zones & Prices', subtitle: 'Fixed rates guaranteed, no surprises',
      calculate: 'Calculate a fare', from: 'Departure zone', to: 'Arrival zone',
      select: 'Select', different: 'Please select two different zones',
      calculating: 'Calculating…', fixedRate: 'Fixed rate guaranteed',
      bookTrip: 'Book this trip →',
      advantages: [
        { title: 'Fixed prices', desc: 'No surprises' },
        { title: 'Premium',      desc: 'Modern vehicles' },
        { title: '24 / 7',       desc: 'Every day' },
      ],
      zonesTitle: 'Zones served', zonesCount: 'zones available 24/7', active: 'Active',
    },
    contact: {
      title: 'Contact us', subtitle: 'Team available 24/7 to help you',
      phoneSub: '24/7, 7 days', whatsappSub: 'Immediate response',
      emailSub: 'Response within 24h', addressSub: 'Service throughout the region',
      faqTitle: 'Frequently asked questions', cta: 'Book a transfer →',
      faq: [
        { q: 'How to book?',             a: 'Fill in the 2-step form on the homepage. Immediate email confirmation with your VTC code.' },
        { q: 'Can I cancel?',            a: 'Yes, free cancellation up to 24h before pickup. Use the token received by email.' },
        { q: 'Are prices fixed?',        a: 'Absolutely. No surprises — the displayed price is the final price, no hidden fees.' },
        { q: 'Payment methods?',         a: 'Cash, bank card, and mobile money (Wave, Orange Money).' },
        { q: 'Do you cover AIBD airport?', a: 'Yes, transfers to and from AIBD 24/7.' },
      ],
    },
  },
}

export type Translations = typeof T['fr']

/* ── Context ─────────────────────────────────────────────────── */
interface LangCtx { lang: Lang; setLang: (l: Lang) => void; t: Translations }
const LanguageContext = createContext<LangCtx | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr')

  useEffect(() => {
    const stored = localStorage.getItem('vtc_lang') as Lang | null
    if (stored === 'fr' || stored === 'en') setLangState(stored)
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('vtc_lang', l)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: T[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider')
  return ctx
}
