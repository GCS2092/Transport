'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from '@/lib/i18n'

const STORAGE_KEY = 'vtc_client_onboarding_v1_done'

export function ClientOnboarding() {
  const { lang } = useTranslation()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true)
    } catch {
      setOpen(true)
    }
  }, [])

  if (!open) return null

  const copy =
    lang === 'en'
      ? {
          title: 'Welcome to WEND’D Transport',
          steps: [
            { t: 'Choose trip type', d: 'One-way, return only, or round trip — zones and airport (AIBD) are built in.' },
            { t: 'Pick date & times', d: 'Set pickup (and return for round trips). Add flight times if needed.' },
            { t: 'Track your ride', d: 'Save your booking code; open Track to follow the driver and manage your trip.' },
          ],
          next: 'Next',
          back: 'Back',
          done: 'Got it',
          skip: 'Skip',
        }
      : {
          title: 'Bienvenue sur WEND’D Transport',
          steps: [
            { t: 'Choisissez le type de trajet', d: 'Aller simple, retour seul ou aller-retour — zones et aéroport (AIBD) sont prévus.' },
            { t: 'Indiquez les dates et heures', d: 'Heure de prise en charge (et retour si aller-retour). Ajoutez les horaires de vol si besoin.' },
            { t: 'Suivez votre course', d: 'Conservez votre code VTC ; utilisez Suivi pour voir le chauffeur et gérer la réservation.' },
          ],
          next: 'Suivant',
          back: 'Retour',
          done: 'C’est compris',
          skip: 'Passer',
        }

  const cur = copy.steps[step]

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch { /* */ }
    setOpen(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/45">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 animate-in fade-in">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-gray-900">{copy.title}</h2>
          <button type="button" onClick={finish} className="text-xs text-gray-400 hover:text-gray-600 font-medium">
            {copy.skip}
          </button>
        </div>
        <div className="mb-6">
          <p className="text-sm font-semibold text-[var(--primary)] mb-1">{cur.t}</p>
          <p className="text-sm text-gray-600 leading-relaxed">{cur.d}</p>
        </div>
        <div className="flex gap-2 mb-4">
          {copy.steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i === step ? 'bg-[var(--primary)]' : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <div className="flex gap-2 justify-between">
          <button
            type="button"
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 disabled:opacity-40"
          >
            {copy.back}
          </button>
          {step < copy.steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--primary)] text-white"
            >
              {copy.next}
            </button>
          ) : (
            <button type="button" onClick={finish} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--primary)] text-white">
              {copy.done}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
