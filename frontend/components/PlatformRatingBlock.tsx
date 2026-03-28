'use client'

import { useState } from 'react'
import { feedbackApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'

export function PlatformRatingBlock() {
  const { lang } = useTranslation()
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  const t =
    lang === 'en'
      ? {
          title: 'Rate your experience',
          hint: 'Optional comment and email for follow-up',
          submit: 'Send',
          thanks: 'Thank you for your feedback!',
          placeholder: 'What went well or what to improve…',
          emailPh: 'Email (optional)',
        }
      : {
          title: 'Notez votre expérience',
          hint: 'Commentaire et email facultatifs',
          submit: 'Envoyer',
          thanks: 'Merci pour votre retour !',
          placeholder: 'Ce qui vous a plu ou ce qu’on peut améliorer…',
          emailPh: 'Email (facultatif)',
        }

  const submit = async () => {
    if (rating < 1 || rating > 5) return
    setSending(true)
    setErr('')
    try {
      await feedbackApi.submitRating({
        rating,
        comment: comment.trim() || undefined,
        email: email.trim() || undefined,
      })
      setDone(true)
    } catch {
      setErr(lang === 'en' ? 'Could not send. Try again later.' : 'Envoi impossible. Réessayez plus tard.')
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 font-medium text-center">
        {t.thanks}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
      <p className="text-sm font-bold text-gray-900">{t.title}</p>
      <div className="flex gap-1 justify-center">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className={`text-2xl leading-none p-1 rounded-lg transition-transform text-amber-400 ${rating >= n || hover >= n ? 'scale-110 opacity-100' : 'opacity-35'}`}
            aria-label={`${n} stars`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder={t.placeholder}
        rows={2}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      />
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder={t.emailPh}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      />
      <p className="text-[11px] text-gray-400">{t.hint}</p>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <button
        type="button"
        disabled={sending || rating < 1}
        onClick={submit}
        className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-40"
      >
        {sending ? '…' : t.submit}
      </button>
    </div>
  )
}
