'use client'

import { useEffect, useState } from 'react'
import { ReservationForm } from '@/components/ReservationForm'
import { LandingPage } from '@/components/LandingPage'

export function HomeClient() {
  const [visited, setVisited] = useState<boolean | null>(null)

  useEffect(() => {
    setVisited(!!localStorage.getItem('vtc_visited'))
    const handler = () => setVisited(false)
    window.addEventListener('vtc_go_home', handler)
    return () => window.removeEventListener('vtc_go_home', handler)
  }, [])

  if (visited === null) return null /* évite le flash SSR */

  if (!visited) {
    return <LandingPage onEnter={() => {
      localStorage.setItem('vtc_visited', '1')
      setVisited(true)
    }} />
  }

  return <ReservationForm />
}
