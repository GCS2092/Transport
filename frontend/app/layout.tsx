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
  robots: { index: true, follow: true },
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
  formatDetection: { telephone: false },
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
          <script
            src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
            defer
          />
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
                    serviceWorkerPath: "/sw.js",
                    serviceWorkerParam: { scope: "/" },
                    notifyButton: { enable: true },
                  });

                  try {
                    const raw = localStorage.getItem("vtc_user");
                    const user = raw ? JSON.parse(raw) : null;
                    if (user?.email) {
                      const email = user.email.trim().toLowerCase();
                      try {
                        await OneSignal.login(email);
                      } catch(e) {
                        if (!String(e).includes('409')) {
                          console.warn("[OneSignal] login error", e);
                        }
                      }
                      console.log("[OneSignal] user linked:", email);
                      const role = (user.role || "client").toLowerCase();
                      OneSignal.User.addTags({ role });
                      console.log("[OneSignal] tag role:", role);
                    } else {
                      console.log("[OneSignal] no user in localStorage, skipping login");
                    }
                  } catch (e) {
                    console.warn("[OneSignal] login error", e);
                  }

                  try {
                    const requestPermission = async () => {
                      try {
                        if (OneSignal.Slidedown?.promptPush) {
                          await OneSignal.Slidedown.promptPush();
                        } else if (OneSignal.Notifications?.requestPermission) {
                          await OneSignal.Notifications.requestPermission();
                        }
                      } catch (e) {
                        console.warn("[OneSignal] permission request error", e);
                      }
                    };
                    document.addEventListener("click", requestPermission, { once: true, passive: true });
                    document.addEventListener("touchstart", requestPermission, { once: true, passive: true });
                    setTimeout(requestPermission, 3000);
                  } catch (e) {}
                });
              `,
            }}
          />
        )}

        {/* Service Worker PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').then(
                    r => console.log('[SW] registered:', r.scope),
                    e => console.warn('[SW] registration failed:', e)
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