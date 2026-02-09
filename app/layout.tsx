import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Script from 'next/script'

// Ottimizzazione font loading con display swap
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap', // Migliora il rendering del font
  preload: true,
})

export const viewport: Viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: 'Bitora - Gestione Rapportini',
  description: 'Sistema per la gestione dei rapportini di assistenza stufe a pellet e legno',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bitora - Gestione Rapportini',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Bitora - Gestione Rapportini',
    description: 'Sistema per la gestione dei rapportini di assistenza stufe a pellet e legno',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Bitora Logo',
      },
    ],
    type: 'website',
    locale: 'it_IT',
    siteName: 'Bitora - Gestione Rapportini',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bitora - Gestione Rapportini',
    description: 'Sistema per la gestione dei rapportini di assistenza stufe a pellet e legno',
    images: ['/logo.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <head>
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={inter.className}>
        {children}
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
