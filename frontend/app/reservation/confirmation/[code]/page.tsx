'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { reservationsApi, Reservation } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function PaymentConfirmationPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'orange' | 'free' | 'bank'>('wave')
  const [notifying, setNotifying] = useState(false)
  const [notified, setNotified] = useState(false)

  // Numéros de paiement (à configurer selon tes besoins)
  const PAYMENT_NUMBERS = {
    wave: '77 123 45 67',
    orange: '77 987 65 43',
    free: '76 543 21 09',
    bank: 'RIB disponible sur demande',
  }

  // Récupérer la réservation
  useEffect(() => {
    if (!code) return

    const loadReservation = async () => {
      try {
        const response = await reservationsApi.getByCode(code)
        setReservation(response.data)

        // Calculer le temps restant
        const createdAt = new Date(response.data.createdAt).getTime()
        const now = Date.now()
        const isInternational = response.data.pickupZone?.name?.toLowerCase().includes('aéroport') ||
                                response.data.dropoffZone?.name?.toLowerCase().includes('aéroport')
        const limitMinutes = isInternational ? 24 * 60 : 20 // 24h ou 20min
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

  // Timer compte à rebours
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

  // Formater le temps restant
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

  // Copier le numéro
  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(PAYMENT_NUMBERS[paymentMethod].replace(/\s/g, ''))
      alert('Numéro copié !')
    } catch {
      alert('Impossible de copier automatiquement')
    }
  }

  // Notifier le paiement
  const handleNotifyPayment = async () => {
    if (!reservation) return
    setNotifying(true)
    try {
      // Appel API pour notifier (à implémenter côté backend si besoin)
      // Pour l'instant on simule le succès
      await new Promise(resolve => setTimeout(resolve, 1000))
      setNotified(true)
    } catch {
      alert('Erreur lors de la notification')
    } finally {
      setNotifying(false)
    }
  }

  // Ouvrir WhatsApp
  const openWhatsApp = () => {
    const phone = '221771234567' // Numéro WhatsApp business
    const message = `Bonjour, je viens d'effectuer le paiement pour ma réservation ${code}. Voici mon reçu.`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    )
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Réservation non trouvée</h1>
          <p className="text-gray-500 mb-6">{error || 'Le code de réservation est invalide'}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  // Si déjà payé
  if (reservation.paymentStatus === 'PAIEMENT_COMPLET') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Paiement confirmé !</h1>
          <p className="text-gray-500 mb-6">Votre réservation {code} est confirmée.</p>
          <button
            onClick={() => router.push(`/suivi?code=${code}`)}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
          >
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-2xl p-6 text-white text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-lg font-bold">Réservation enregistrée</h1>
          <p className="text-sm text-white/80">En attente de confirmation paiement</p>
        </div>

        {/* Code réservation */}
        <div className="bg-white rounded-b-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide text-center mb-2">Code de réservation</p>
          <p className="text-3xl font-mono font-bold text-center text-gray-900 mb-3">{reservation.code}</p>
          <p className="text-sm text-gray-600 text-center">
            {reservation.pickupZone?.name || 'Adresse personnalisée'} → {reservation.dropoffZone?.name || 'Adresse personnalisée'}
            <span className="mx-2">•</span>
            {formatCurrency(reservation.amount)}
            <span className="mx-2">•</span>
            {format(new Date(reservation.pickupDateTime), 'dd/MM/yyyy', { locale: fr })}
          </p>
        </div>

        {/* Timer */}
        {!isExpired && (
          <div className={`rounded-xl p-4 mb-4 flex items-center gap-3 ${
            timeLeft < 5 * 60 * 1000 ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
          }`}>
            <svg className={`w-5 h-5 ${timeLeft < 5 * 60 * 1000 ? 'text-red-600' : 'text-amber-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${timeLeft < 5 * 60 * 1000 ? 'text-red-700' : 'text-amber-700'}`}>
                {isInternational ? 'Vous avez 24h pour confirmer' : `Votre réservation expire dans ${formatTimeLeft()}`}
              </p>
              {!isInternational && (
                <p className="text-xs text-gray-500 mt-0.5">Passé ce délai, la réservation sera annulée</p>
              )}
            </div>
          </div>
        )}

        {isExpired && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-center">
            <p className="text-red-700 font-semibold">Délai expiré</p>
            <p className="text-sm text-red-600 mt-1">Cette réservation a été annulée</p>
          </div>
        )}

        {/* Méthodes de paiement */}
        {!isExpired && !notified && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Effectuez votre paiement via :</p>
              
              <div className="flex gap-2 mb-4">
                {[
                  { id: 'wave', label: 'Wave', color: 'bg-blue-500' },
                  { id: 'orange', label: 'Orange Money', color: 'bg-orange-500' },
                  { id: 'free', label: 'Free Money', color: 'bg-red-500' },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                      paymentMethod === method.id
                        ? `${method.color} text-white`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>

              {/* Numéro de paiement */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Numéro de paiement</p>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-mono font-bold text-gray-900">{PAYMENT_NUMBERS[paymentMethod]}</p>
                  <button
                    onClick={copyNumber}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Copier
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Mentionnez <span className="font-semibold text-gray-700">{reservation.code}</span> en référence/note du transfert
                </p>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Via WhatsApp</p>
                  <p className="text-xs text-gray-500">Envoyez votre reçu directement</p>
                </div>
                <button
                  onClick={openWhatsApp}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Ouvrir
                </button>
              </div>
            </div>

            {/* Virement bancaire */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Virement bancaire</p>
                  <p className="text-xs text-gray-500">RIB/IBAN fourni après sélection</p>
                </div>
                <button
                  onClick={() => setPaymentMethod('bank')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    paymentMethod === 'bank'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Choisir
                </button>
              </div>
            </div>

            {/* Bouton J'ai payé */}
            <button
              onClick={handleNotifyPayment}
              disabled={notifying}
              className="w-full py-4 bg-emerald-600 text-white rounded-xl text-base font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-200"
            >
              {notifying ? 'Envoi en cours...' : "J'ai effectué mon paiement"}
            </button>

            {/* Annuler */}
            <button
              onClick={() => router.push(`/suivi?code=${code}`)}
              className="w-full py-3 mt-3 text-gray-500 text-sm hover:text-gray-700 transition-colors"
            >
              Annuler la réservation
            </button>
          </>
        )}

        {/* Confirmation notification */}
        {notified && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-emerald-800 mb-2">Notification envoyée !</h2>
            <p className="text-sm text-emerald-600 mb-4">
              Notre équipe va vérifier votre paiement et confirmer votre réservation sous peu.
            </p>
            <button
              onClick={() => router.push(`/suivi?code=${code}`)}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
            >
              Suivre ma réservation
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
