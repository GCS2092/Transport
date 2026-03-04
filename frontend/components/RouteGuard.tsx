'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router   = useRouter()

  useEffect(() => {
    if (loading) return

    const isDriverRoute = pathname.startsWith('/chauffeur')

    if (user?.role === 'DRIVER' && !isDriverRoute) {
      /* Chauffeur connecté → pages client interdites */
      router.replace('/chauffeur')
      return
    }

    if (!user && isDriverRoute) {
      /* Non authentifié → pas accès à l'espace chauffeur */
      router.replace('/')
    }
  }, [loading, user, pathname, router])

  /* Masquer le contenu pendant la redirection */
  if (!loading) {
    const isDriverRoute = pathname.startsWith('/chauffeur')
    if (user?.role === 'DRIVER' && !isDriverRoute) return null
    if (!user && isDriverRoute) return null
  }

  return <>{children}</>
}
