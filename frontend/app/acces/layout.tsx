import type { Metadata } from "next"

export const metadata: Metadata = {
  manifest: "/manifest-chauffeur.json",
  robots: { index: false, follow: false },
}

export default function AccesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}