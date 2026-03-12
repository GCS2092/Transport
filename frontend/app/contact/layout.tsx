import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact - WEND'D Transport | Téléphone, WhatsApp, Dakar",
  description:
    "Contactez WEND'D Transport pour réserver votre transfert aéroport à Dakar. Téléphone et WhatsApp : +221 78 861 33 08. Disponibles 24h/24.",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
