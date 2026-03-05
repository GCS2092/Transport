'use client'

import { useState, useEffect } from 'react'
import { getHistory, clearHistory, type ReservationHistory as ReservationHistoryType } from '@/lib/clientStorage'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'

const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
)

const IconArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
)

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  EN_ATTENTE: { label: 'En attente', color: 'text-amber-700', bg: 'bg-amber-100' },
  ASSIGNEE: { label: 'Assignée', color: 'text-blue-700', bg: 'bg-blue-100' },
  EN_COURS: { label: 'En cours', color: 'text-purple-700', bg: 'bg-purple-100' },
  TERMINEE: { label: 'Terminée', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  ANNULEE: { label: 'Annulée', color: 'text-red-700', bg: 'bg-red-100' },
}

export function ReservationHistory() {
  const [history, setHistory] = useState<ReservationHistoryType[]>([])
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadHistory()
    // Écouter les événements de nouvelle réservation
    const handler = () => loadHistory()
    window.addEventListener('vtc_code_saved', handler)
    return () => window.removeEventListener('vtc_code_saved', handler)
  }, [])

  const loadHistory = () => {
    setHistory(getHistory())
  }

  const handleClearHistory = () => {
    clearHistory()
    setHistory([])
    setShowConfirmClear(false)
  }

  const handleViewReservation = (code: string) => {
    router.push(`/suivi?code=${code}`)
  }

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <IconClock />
        </div>
        <p className="text-sm text-gray-500">Aucune réservation récente</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">Mes réservations récentes</h2>
        <button
          onClick={() => setShowConfirmClear(true)}
          className="text-xs text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1"
        >
          <IconTrash />
          Effacer
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {history.map((reservation) => {
          const statusConf = STATUS_CONFIG[reservation.status] || STATUS_CONFIG.EN_ATTENTE
          const date = new Date(reservation.date)
          
          return (
            <button
              key={reservation.code}
              onClick={() => handleViewReservation(reservation.code)}
              className="w-full p-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-bold text-sm text-gray-900 mb-1">
                    {reservation.code}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="truncate">{reservation.pickupZone}</span>
                    <IconArrowRight />
                    <span className="truncate">{reservation.dropoffZone}</span>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusConf.bg} ${statusConf.color} flex-shrink-0 ml-2`}>
                  {statusConf.label}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(reservation.amount)}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Modal de confirmation */}
      {showConfirmClear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Effacer l'historique ?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Cette action supprimera toutes vos réservations récentes de cet appareil. Vous pourrez toujours les retrouver avec leur code.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleClearHistory}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Effacer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
