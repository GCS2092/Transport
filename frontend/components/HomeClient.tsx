'use client'

import { useEffect, useState } from 'react'
import { ReservationForm } from '@/components/ReservationForm'
import { ReservationHistory } from '@/components/ReservationHistory'
import { LandingPage } from '@/components/LandingPage'
import { ClientOnboarding } from '@/components/ClientOnboarding'
import { PlatformRatingBlock } from '@/components/PlatformRatingBlock'

export function HomeClient() {
  const [visited, setVisited] = useState<boolean | null>(null)

  const safeGet = (key: string) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }

  useEffect(() => {
    setVisited(!!safeGet('vtc_visited'))
    const handler = () => setVisited(false)
    window.addEventListener('vtc_go_home', handler)
    return () => window.removeEventListener('vtc_go_home', handler)
  }, [])

  if (visited === null) return null /* évite le flash SSR */

  if (!visited) {
    return <LandingPage onEnter={() => {
      try {
        localStorage.setItem('vtc_visited', '1')
      } catch {}
      setVisited(true)
    }} />
  }

  return (
    <div className="min-h-[calc(100dvh-7rem)] bg-gray-50 pb-10">
      <ClientOnboarding />
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <ReservationHistory />
        <ReservationForm />
        <PlatformRatingBlock />
      </div>
    </div>
  )
}
