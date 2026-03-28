'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { reservationsApi, Reservation } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  fetchPublicContacts,
  paymentDisplayFromContacts,
  whatsappDigitsFromContacts,
  type SettingsContactRow,
} from '@/lib/settingsPublic'

export default function PaymentConfirmationPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'orange' | 'free'>('wave')
  const [notifying, setNotifying] = useState(false)
  const [notified, setNotified] = useState(false)
  const [showBankDetails, setShowBankDetails] = useState(false)
  const [publicContacts, setPublicContacts] = useState<SettingsContactRow[]>([])

  useEffect(() => {
    fetchPublicContacts()
      .then(setPublicContacts)
      .catch(() => setPublicContacts([]))
  }, [])

  const PAYMENT_NUMBERS = useMemo(
    () =>
      paymentDisplayFromContacts(publicContacts, {
        wave: '77 123 45 67',
        orange: '77 987 65 43',
        free: '76 543 21 09',
        bank: 'RIB sur demande',
      }),
    [publicContacts],
  )

  const waDigits = useMemo(() => whatsappDigitsFromContacts(publicContacts), [publicContacts])

  useEffect(() => {
    if (!code) return

    const loadReservation = async () => {
      try {
        const response = await reservationsApi.getByCode(code)
        setReservation(response.data)

        const createdAt = new Date(response.data.createdAt).getTime()
        const now = Date.now()
        const isInternational = response.data.pickupZone?.name?.toLowerCase().includes('aéroport') ||
                                response.data.dropoffZone?.name?.toLowerCase().includes('aéroport')
        const limitMinutes = isInternational ? 24 * 60 : 20
        const limitMs = limitMinutes * 60 * 1000
        const elapsed = now - createdAt
        const remaining = Math.max(0, limitMs - elapsed)
        
        setTimeLeft(remaining)
      } catch (err: any) {
        setError(err.response?.data?.message || 'Réservation non trouvée')
      } finally {
        setLoading(false)
      }
    }

    loadReservation()
  }, [code])

  useEffect(() => {
    if (timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1000) {
          clearInterval(timer)
          return 0
        }
        return prev - 1000
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  const formatTimeLeft = useCallback(() => {
    if (timeLeft <= 0) return 'Expiré'
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60))
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

    if (hours > 0) {
      return `${hours}h ${minutes}min`
    }
    return `${minutes}min ${seconds}s`
  }, [timeLeft])

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(PAYMENT_NUMBERS[paymentMethod].replace(/\s/g, ''))
      alert('Numéro copié !')
    } catch {
      alert('Impossible de copier')
    }
  }

  const handleNotifyPayment = async () => {
    if (!reservation) return
    setNotifying(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setNotified(true)
    } catch {
      alert('Erreur lors de la notification')
    } finally {
      setNotifying(false)
    }
  }

  const openWhatsApp = () => {
    const message = `Bonjour, je viens d'effectuer le paiement pour ma réservation ${code}. Voici mon reçu.`
    window.open(`https://wa.me/${waDigits}?text=${encodeURIComponent(message)}`, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Réservation non trouvée</h1>
          <p className="text-gray-500 mb-6">{error || 'Code invalide'}</p>
          <button onClick={() => router.push('/')} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold">
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  if (reservation.paymentStatus === 'PAIEMENT_COMPLET') {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Paiement confirmé !</h1>
          <p className="text-gray-500 mb-6">Votre réservation est confirmée.</p>
          <button onClick={() => router.push(`/suivi?code=${code}`)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold">
            Suivre ma course
          </button>
        </div>
      </div>
    )
  }

  const isExpired = timeLeft <= 0
  const isInternational = reservation.pickupZone?.name?.toLowerCase().includes('aéroport') ||
                          reservation.dropoffZone?.name?.toLowerCase().includes('aéroport')

  return (
    <div className="min-h-screen bg-[#f5f5f0] py-8 px-4">
      <div className="max-w-md mx-auto">
        
        {/* Header bleu */}
        <div className="bg-blue-700 rounded-t-2xl p-6 text-white text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-lg font-bold">Réservation enregistrée</h1>
          <p className="text-sm text-white/80">Choisissez votre méthode de paiement</p>
        </div>

        {/* Code réservation */}
        <div className="bg-white border-x border-b border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-500 mb-2">Code réservation</p>
          <p className="text-4xl font-mono font-bold text-gray-900 mb-2">{reservation.code}</p>
          <p className="text-sm text-gray-600">
            {reservation.pickupZone?.name || 'Adresse'} → {reservation.dropoffZone?.name || 'Adresse'}
            <span className="mx-2">•</span>
            {formatCurrency(reservation.amount)}
            <span className="mx-2">•</span>
            {format(new Date(reservation.pickupDateTime), 'dd/MM/yyyy', { locale: fr })}
          </p>
        </div>

        {/* Options de paiement */}
        {!isExpired && !notified && (
          <div className="bg-white border-x border-b border-gray-200 rounded-b-2xl p-6 space-y-4">
            <p className="text-base font-semibold text-gray-800 mb-4">Comment souhaitez-vous payer ?</p>
            
            {/* WhatsApp - Recommandé */}
            <div className="relative border-2 border-emerald-500 rounded-xl p-4 bg-emerald-50/50">
              <span className="absolute -top-3 left-4 bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Recommandé
              </span>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Via WhatsApp</p>
                  <p className="text-sm text-gray-500">Envoyez votre reçu directement</p>
                </div>
                <button
                  onClick={openWhatsApp}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Ouvrir
                </button>
              </div>
            </div>

            {/* Virement bancaire */}
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Virement bancaire</p>
                  <p className="text-sm text-gray-500">RIB/IBAN fourni après sélection</p>
                </div>
                <button
                  onClick={() => setShowBankDetails(!showBankDetails)}
                  className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  {showBankDetails ? 'Masquer' : 'Choisir'}
                </button>
              </div>
              
              {showBankDetails && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700 mb-2">RIB :</p>
                  <p className="text-sm font-mono text-gray-600 mb-1">SN12 1234 5678 9012 3456 7890 123</p>
                  <p className="text-xs text-gray-500">Mentionnez {reservation.code} en référence</p>
                </div>
              )}
            </div>

            {/* Mobile Money */}
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Paiement mobile</p>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setPaymentMethod('wave')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    paymentMethod === 'wave' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  Wave
                </button>
                <button
                  onClick={() => setPaymentMethod('orange')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    paymentMethod === 'orange' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-600'
                  }`}
                >
                  Orange
                </button>
                <button
                  onClick={() => setPaymentMethod('free')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    paymentMethod === 'free' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600'
                  }`}
                >
                  Free
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Numéro de paiement</p>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-mono font-bold text-gray-900">{PAYMENT_NUMBERS[paymentMethod]}</p>
                  <button
                    onClick={copyNumber}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Copier
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Mentionnez <span className="font-semibold text-gray-700">{reservation.code}</span> en référence
                </p>
              </div>
            </div>

            {/* Timer */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-700">
                {isInternational 
                  ? 'Vous avez 24h pour confirmer votre paiement'
                  : `Vous avez ${formatTimeLeft()} pour confirmer`
                }
              </p>
            </div>

            {/* Bouton J'ai payé */}
            <button
              onClick={handleNotifyPayment}
              disabled={notifying}
              className="w-full py-4 bg-emerald-600 text-white rounded-xl text-base font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-200"
            >
              {notifying ? 'Envoi...' : "J'ai effectué mon paiement"}
            </button>

            <button onClick={() => router.push('/')} className="w-full py-3 text-gray-500 text-sm hover:text-gray-700">
              Annuler la réservation
            </button>
          </div>
        )}

        {isExpired && (
          <div className="bg-white border-x border-b border-gray-200 rounded-b-2xl p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-red-700 mb-2">Délai expiré</h2>
            <p className="text-gray-500 mb-4">Votre réservation a été annulée.</p>
            <button onClick={() => router.push('/')} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold">
              Nouvelle réservation
            </button>
          </div>
        )}

        {notified && (
          <div className="bg-white border-x border-b border-gray-200 rounded-b-2xl p-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-emerald-800 mb-2">Notification envoyée !</h2>
            <p className="text-sm text-emerald-600 mb-4">Votre paiement sera vérifié sous peu.</p>
            <button onClick={() => router.push(`/suivi?code=${code}`)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold">
              Suivre ma réservation
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
