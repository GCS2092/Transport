import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion - WEND'D Transport",
  description: "Espace de connexion WEND'D Transport.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
