import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { RouteGuard } from "@/components/RouteGuard";
import { LanguageProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://wenddtransport.com"),
  title: "WEND'D Transport - Transferts Aéroport & VTC à Dakar",
  description:
    "Transferts aéroport à Dakar, tarifs fixes, chauffeurs professionnels 24h/24. VTC premium AIBD et toutes zones.",
  alternates: {
    canonical: "https://wenddtransport.com",
  },
  manifest: "/manifest-client.json",
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
  maximumScale: 5,
  userScalable: true,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['LocalBusiness', 'TaxiService'],
      '@id': 'https://wenddtransport.com/#business',
      name: "WEND'D Transport",
      description: 'Service VTC & transferts aéroport à Dakar. Tarifs fixes, chauffeurs professionnels disponibles 24h/24.',
      url: 'https://wenddtransport.com',
      telephone: '+221338676767',
      email: 'wenddtransport@gmail.com',
      priceRange: '$$',
      currenciesAccepted: 'XOF, EUR, USD',
      paymentAccepted: 'Cash, Bank transfer',
      openingHours: 'Mo-Su 00:00-23:59',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Dakar',
        addressLocality: 'Dakar',
        addressCountry: 'SN',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 14.6937,
        longitude: -17.4441,
      },
      areaServed: [
        { '@type': 'City', name: 'Dakar' },
        { '@type': 'Airport', name: 'Aéroport International Blaise Diagne', iataCode: 'DSS' },
      ],
      sameAs: [
        'https://www.instagram.com/wendd_transport',
        'https://www.facebook.com/share/1Ak5f2h2j2/',
        'https://www.tiktok.com/@wendd.transport',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://wenddtransport.com/#website',
      url: 'https://wenddtransport.com',
      name: "WEND'D Transport",
      inLanguage: ['fr', 'en'],
      potentialAction: {
        '@type': 'ReserveAction',
        target: 'https://wenddtransport.com',
        name: 'Réserver un transfert',
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const onesignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

  return (
    <html lang="fr" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Preload image LCP — évite la détection tardive */}
        <link
          rel="preload"
          as="image"
          href="/images/FOND.jpeg"
          // @ts-ignore
          fetchPriority="high"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
                (function() {
                  var appId = ${JSON.stringify(onesignalAppId)};
                  var loaded = false;
                  function loadOneSignal() {
                    if (loaded) return;
                    loaded = true;
                    var s = document.createElement('script');
                    s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
                    s.async = true;
                    s.onload = function() {
                      window.OneSignalDeferred = window.OneSignalDeferred || [];
                      OneSignalDeferred.push(async function(OneSignal) {
                        await OneSignal.init({
                          appId: appId,
                          safari_web_id: "web.onesignal.auto.0818a4e7-118f-4fc1-b0e2-07892e811a2a",
                          notifyButton: { enable: true },
                        });
                        try {
                          var raw = localStorage.getItem("vtc_user");
                          var user = raw ? JSON.parse(raw) : null;
                          if (user && user.email) {
                            var email = user.email.trim().toLowerCase();
                            try { await OneSignal.login(email); } catch(e) {
                              if (!String(e).includes("409")) console.warn("[OneSignal] login error", e);
                            }
                            var roleMap = { driver: "chauffeur", admin: "admin" };
                            var role = roleMap[(user.role || "").toLowerCase()] || "client";
                            OneSignal.User.addTags({ role: role });
                          }
                        } catch(e) { console.warn("[OneSignal] error", e); }
                        try {
                          var reqPerm = async function() {
                            try {
                              if (OneSignal.Slidedown && OneSignal.Slidedown.promptPush) await OneSignal.Slidedown.promptPush();
                              else if (OneSignal.Notifications && OneSignal.Notifications.requestPermission) await OneSignal.Notifications.requestPermission();
                            } catch(e) {}
                          };
                          document.addEventListener("click", reqPerm, { once: true, passive: true });
                          document.addEventListener("touchstart", reqPerm, { once: true, passive: true });
                        } catch(e) {}
                      });
                    };
                    document.head.appendChild(s);
                  }
                  document.addEventListener("click", loadOneSignal, { once: true, passive: true });
                  document.addEventListener("touchstart", loadOneSignal, { once: true, passive: true });
                  document.addEventListener("scroll", loadOneSignal, { once: true, passive: true });
                  setTimeout(loadOneSignal, 4000);
                })();
              `,
            }}
          />
        )}

        {/* Désinstaller TOUS les Service Workers existants sans en réenregistrer */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(regs) {
                  regs.forEach(function(r) { r.unregister(); });
                });
                if ('caches' in window) {
                  caches.keys().then(function(keys) {
                    keys.forEach(function(k) { caches.delete(k); });
                  });
                }
              }
            `,
          }}
        />
      </body>
    </html>
  );
}