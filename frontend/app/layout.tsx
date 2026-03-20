import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { RouteGuard } from "@/components/RouteGuard";
import { LanguageProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://wenddtransport.com"),
  title: "WEND'D Transport - Transferts Aéroport & VTC à Dakar",
  description:
    "Réservez votre transfert aéroport à Dakar en 2 minutes. Tarifs fixes, chauffeurs professionnels disponibles 24h/24. Service VTC premium pour AIBD et toutes zones de Dakar.",
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://wenddtransport.com",
    siteName: "WEND'D Transport",
    title: "WEND'D Transport - Transferts Aéroport & VTC à Dakar",
    description:
      "Réservez votre transfert aéroport à Dakar en 2 minutes. Tarifs fixes, chauffeurs professionnels disponibles 24h/24.",
    images: [
      {
        url: "/images/FOND.jpeg",
        width: 1200,
        height: 630,
        alt: "WEND'D Transport - VTC Dakar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WEND'D Transport - Transferts Aéroport & VTC à Dakar",
    description:
      "Réservez votre transfert aéroport à Dakar en 2 minutes. Tarifs fixes, chauffeurs pro 24h/24.",
    images: ["/images/FOND.jpeg"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WEND'D Transport",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/images/FOND.jpeg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D3B2E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const onesignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

  return (
    <html lang="fr">
      <head>
        {onesignalAppId && (
          <>
            <script
              src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
              defer
            />
          </>
        )}
      </head>
      <body className="min-h-screen flex flex-col">
        <LanguageProvider>
          <AuthProvider>
            <Navbar />
            <main className="flex-1 pb-20">
              <RouteGuard>{children}</RouteGuard>
            </main>
          </AuthProvider>
        </LanguageProvider>

        <Analytics />
        <SpeedInsights />

        {onesignalAppId && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.OneSignalDeferred = window.OneSignalDeferred || [];
                OneSignalDeferred.push(async function(OneSignal) {
                  await OneSignal.init({
                    appId: ${JSON.stringify(onesignalAppId)},
                    safari_web_id: "web.onesignal.auto.0818a4e7-118f-4fc1-b0e2-07892e811a2a",
                    notifyButton: { enable: true },
                  });

                  // 🔹 LOGIN USER AUTOMATIQUE
                  try {
                    const user = JSON.parse(localStorage.getItem("user"));
                    if (user?.email) {
                      await OneSignal.login(user.email.toLowerCase());
                      console.log("OneSignal user linked:", user.email);
                    }
                  } catch (e) { console.log("OneSignal login error", e); }

                  // 🔹 TAG ROLE
                  try { OneSignal.User.addTags({ role: "client" }); } catch (e) {}

                  // 🔹 DEMANDE PERMISSION PUSH
                  try {
                    const handler = async () => {
                      try {
                        if (OneSignal.Slidedown?.promptPush) {
                          await OneSignal.Slidedown.promptPush();
                        } else if (OneSignal.Notifications?.requestPermission) {
                          await OneSignal.Notifications.requestPermission();
                        }
                      } catch (e) {}
                    };
                    document.addEventListener("click", handler, { once: true, passive: true });
                    document.addEventListener("touchstart", handler, { once: true, passive: true });
                    setTimeout(handler, 3000); // fallback automatique
                  } catch (e) {}
                });
              `,
            }}
          />
        )}

        {/* Enregistrement Service Worker pour PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').then(
                    registration => console.log('SW registered:', registration),
                    err => console.log('SW registration failed:', err)
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}