import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact - WEND'D Transport | Transferts Aéroport Dakar",
  description: "Contactez WEND'D Transport par téléphone, WhatsApp ou email. Service disponible 24h/24 pour vos transferts aéroport et VTC à Dakar.",
  openGraph: {
    title: "Contact - WEND'D Transport | Transferts Aéroport Dakar",
    description: "Contactez WEND'D Transport par téléphone, WhatsApp ou email. Service disponible 24h/24 pour vos transferts aéroport et VTC à Dakar.",
    url: "https://wenddtransport.com/contact",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}