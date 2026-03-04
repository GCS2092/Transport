import type { ReactNode } from 'react'
import { DriverBottomNav } from '@/components/DriverBottomNav'

export default function DriverLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <DriverBottomNav />
    </>
  )
}
