'use client'

import { useRouter } from 'next/navigation'
import { LoginModal } from '@/components/LoginModal'

export default function AccesClient() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[var(--primary)]">
      <LoginModal onClose={() => router.push('/')} />
    </div>
  )
}