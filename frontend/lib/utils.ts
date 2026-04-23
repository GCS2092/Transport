import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CLIENT_RATES: Record<string, number> = {
  EUR: 0.001525,
  USD: 0.001667,
}

function convertFromXof(amount: number, currency?: string | null): { currency: string; converted: number } {
  const target = currency && CLIENT_RATES[currency] ? currency : 'EUR'
  return {
    currency: target,
    converted: Math.round(amount * CLIENT_RATES[target]),
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA'
}

export function formatReservationAmount(amount: number, currency?: string | null): string {
  const { currency: target, converted } = convertFromXof(amount, currency)
  return target === 'EUR' ? `€${converted}` : `$${converted}`
}

export function formatClientAmount(amount: number, currency?: string | null): string {
  const { currency: target, converted } = convertFromXof(amount, currency)
  return target === 'EUR' ? `€${converted}` : `$${converted}`
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
