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
    const isAdminRoute = pathname.startsWith('/admin')

    if (user?.role === 'DRIVER' && !isDriverRoute) {
      /* Chauffeur connecté → pages client/admin interdites */
      router.replace('/chauffeur')
      return
    }

    if (user?.role === 'ADMIN' && !isAdminRoute) {
      /* Admin connecté → pages client/chauffeur interdites */
      router.replace('/admin')
      return
    }

    if (!user && isDriverRoute) {
      /* Non authentifié → pas accès à l'espace chauffeur */
      router.replace('/')
      return
    }

    if (!user && isAdminRoute) {
      /* Non authentifié → pas accès à l'espace admin */
      router.replace('/')
      return
    }

    if (user?.role === 'DRIVER' && isAdminRoute) {
      /* Chauffeur → pas accès admin */
      router.replace('/chauffeur')
    }
  }, [loading, user, pathname, router])

  /* Masquer le contenu pendant la redirection */
  if (!loading) {
    const isDriverRoute = pathname.startsWith('/chauffeur')
    const isAdminRoute = pathname.startsWith('/admin')
    
    if (user?.role === 'DRIVER' && !isDriverRoute) return null
    if (user?.role === 'ADMIN' && !isAdminRoute) return null
    if (!user && isDriverRoute) return null
    if (!user && isAdminRoute) return null
    if (user?.role === 'DRIVER' && isAdminRoute) return null
  }

  return <>{children}</>
}
