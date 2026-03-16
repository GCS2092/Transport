import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zones et tarifs - WEND'D Transport | Prix transferts Dakar AIBD",
  description: "Consultez les tarifs fixes de WEND'D Transport pour tous les trajets à Dakar : aéroport AIBD, aller simple, aller-retour. Prix transparents par zone.",
  openGraph: {
    title: "Zones et tarifs - WEND'D Transport | Prix transferts Dakar AIBD",
    description: "Consultez les tarifs fixes de WEND'D Transport pour tous les trajets à Dakar.",
    url: "https://wenddtransport.com/zones-tarifs",
  },
};

export default function ZonesTarifsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}