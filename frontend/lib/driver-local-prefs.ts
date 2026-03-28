/** Préférences locales chauffeur : masquage d’historique / paiements (données API inchangées). */

const K_HISTORY = 'vtc_driver_history_cleared_at'
const K_PAYMENTS = 'vtc_driver_payments_cleared_at'

function safeGet(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, value)
  } catch { /* private mode */ }
}

function safeRemove(key: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(key)
  } catch { /* */ }
}

export function getDriverHistoryClearedAt(): Date | null {
  const raw = safeGet(K_HISTORY)
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export function setDriverHistoryClearedNow() {
  safeSet(K_HISTORY, new Date().toISOString())
}

export function clearDriverHistoryPreference() {
  safeRemove(K_HISTORY)
}

export function getDriverPaymentsClearedAt(): Date | null {
  const raw = safeGet(K_PAYMENTS)
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export function setDriverPaymentsClearedNow() {
  safeSet(K_PAYMENTS, new Date().toISOString())
}

export function clearDriverPaymentsPreference() {
  safeRemove(K_PAYMENTS)
}
