// Utilitaire pour gérer les données client en localStorage

export interface SavedClientInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  lastPromoCode?: string
  lastPickupZoneId?: string
  lastDropoffZoneId?: string
}

export interface ReservationHistory {
  code: string
  date: string
  pickupZone: string
  dropoffZone: string
  amount: number
  status: string
}

const CLIENT_INFO_KEY = 'vtc_client_info'
const RESERVATION_HISTORY_KEY = 'vtc_reservation_history'

// Sauvegarde des informations client
export function saveClientInfo(info: SavedClientInfo): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CLIENT_INFO_KEY, JSON.stringify(info))
  } catch (e) {
    console.error('Failed to save client info', e)
  }
}

// Récupération des informations client
export function getClientInfo(): SavedClientInfo | null {
  if (typeof window === 'undefined') return null
  try {
    const data = localStorage.getItem(CLIENT_INFO_KEY)
    return data ? JSON.parse(data) : null
  } catch (e) {
    console.error('Failed to get client info', e)
    return null
  }
}

// Effacer les informations client
export function clearClientInfo(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CLIENT_INFO_KEY)
  } catch (e) {
    console.error('Failed to clear client info', e)
  }
}

// Ajouter une réservation à l'historique
export function addToHistory(reservation: ReservationHistory): void {
  if (typeof window === 'undefined') return
  try {
    const history = getHistory()
    // Ajouter au début et garder seulement les 10 dernières
    const updated = [reservation, ...history.filter(r => r.code !== reservation.code)].slice(0, 10)
    localStorage.setItem(RESERVATION_HISTORY_KEY, JSON.stringify(updated))
  } catch (e) {
    console.error('Failed to add to history', e)
  }
}

// Récupérer l'historique des réservations
export function getHistory(): ReservationHistory[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(RESERVATION_HISTORY_KEY)
    return data ? JSON.parse(data) : []
  } catch (e) {
    console.error('Failed to get history', e)
    return []
  }
}

// Effacer l'historique
export function clearHistory(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(RESERVATION_HISTORY_KEY)
  } catch (e) {
    console.error('Failed to clear history', e)
  }
}

// Mettre à jour le statut d'une réservation dans l'historique
export function updateReservationStatus(code: string, status: string): void {
  if (typeof window === 'undefined') return
  try {
    const history = getHistory()
    
    // Si la course est terminée ou annulée, la supprimer de l'historique
    if (status === 'TERMINEE' || status === 'ANNULEE') {
      const updated = history.filter(r => r.code !== code)
      localStorage.setItem(RESERVATION_HISTORY_KEY, JSON.stringify(updated))
    } else {
      // Sinon, mettre à jour le statut
      const updated = history.map(r => r.code === code ? { ...r, status } : r)
      localStorage.setItem(RESERVATION_HISTORY_KEY, JSON.stringify(updated))
    }
  } catch (e) {
    console.error('Failed to update reservation status', e)
  }
}
