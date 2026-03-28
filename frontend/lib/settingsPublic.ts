import { api } from '@/lib/api'

export interface SettingsContactRow {
  id: string
  label: string
  value: string
  subtitle?: string | null
  href?: string | null
  icon?: string | null
  order: number
  active: boolean
}

export interface SettingsFaqRow {
  id: string
  question: string
  answer: string
  language: string
  order: number
  active: boolean
}

export async function fetchPublicContacts(): Promise<SettingsContactRow[]> {
  const { data } = await api.get<SettingsContactRow[]>('/settings/contacts')
  return data
}

export async function fetchPublicFaqs(lang: 'fr' | 'en'): Promise<SettingsFaqRow[]> {
  const { data } = await api.get<SettingsFaqRow[]>('/settings/faqs', { params: { language: lang } })
  return data
}

/** Chiffres uniquement, sans +, pour wa.me */
export function whatsappDigitsFromContacts(contacts: SettingsContactRow[], fallback = '221788613308'): string {
  const wa = contacts.find(
    c =>
      /\bwhatsapp\b/i.test(c.label) ||
      (!!c.href && /wa\.me/i.test(c.href)),
  )
  if (wa?.href) {
    const m = wa.href.match(/wa\.me\/(\d+)/i)
    if (m?.[1]) return m[1]
  }
  const digits = wa?.value?.replace(/\D/g, '') ?? ''
  if (digits.length >= 9) return digits
  return fallback
}

/** Numéros affichés sur l’écran de paiement (libellés contenant Wave / Orange / Free). */
export function paymentDisplayFromContacts(
  contacts: SettingsContactRow[],
  fallbacks: { wave: string; orange: string; free: string; bank: string },
): { wave: string; orange: string; free: string; bank: string } {
  const pick = (test: (label: string) => boolean) => contacts.find(c => test(c.label))?.value

  return {
    wave: pick(l => /wave/i.test(l)) ?? fallbacks.wave,
    orange: pick(l => /orange/i.test(l)) ?? fallbacks.orange,
    free:
      pick(l => /\bfree\b/i.test(l) || /free money/i.test(l)) ?? fallbacks.free,
    bank: fallbacks.bank,
  }
}

/** Contacts à montrer sur la page Contact public (exclut les lignes « Paiement … »). */
export function contactPageRows(contacts: SettingsContactRow[]): SettingsContactRow[] {
  return contacts.filter(c => !/paiement/i.test(c.label))
}
