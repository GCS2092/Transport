import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA'
}

const CLIENT_RATES: Record<string, number> = {
  EUR: 0.001525,
  USD: 0.001667,
}

export function formatReservationAmount(amount: number, currency?: string | null): string {
  if (currency && CLIENT_RATES[currency]) {
    const converted = Math.round(amount * CLIENT_RATES[currency])
    return currency === 'EUR' ? `€${converted}` : `$${converted}`
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA'
}

export function formatClientAmount(amount: number, currency?: string | null): string {
  if (currency && CLIENT_RATES[currency]) {
    const converted = Math.round(amount * CLIENT_RATES[currency])
    return currency === 'EUR' ? `€${converted}` : `$${converted}`
  }
  // Fallback EUR si aucune devise n'est précisée pour le client
  const converted = Math.round(amount * CLIENT_RATES['EUR'])
  return `€${converted}`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}
