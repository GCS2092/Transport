import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Suivi de réservation - WEND'D Transport | Suivi en temps réel",
  description:
    "Suivez votre réservation WEND'D Transport en temps réel. Entrez votre numéro de réservation pour voir le statut et la position de votre chauffeur.",
};

export default function SuiviLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
