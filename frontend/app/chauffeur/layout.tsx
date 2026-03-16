import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Espace Chauffeur - WEND'D Transport",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ChauffeursLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}