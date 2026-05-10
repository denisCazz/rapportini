import type { Metadata, Viewport } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import { Toaster } from 'sonner';
import CookieConsent from '@/components/CookieConsent';
import { PWAProvider } from '@/lib/pwa-context';
import './globals.css';
import Script from 'next/script';
import { cn } from '@/lib/utils';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-sans',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
});

export const viewport: Viewport = {
  themeColor: '#ea580c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'Bitora - Software di Gestione Specializzato',
  description:
    'Piattaforma verticale per la gestione operativa specializzata e dei rapportini di intervento',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bitora - Software di Gestione Specializzato',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Bitora - Software di Gestione Specializzato',
    description:
      'Piattaforma verticale per la gestione operativa specializzata e dei rapportini di intervento',
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
    siteName: 'Bitora - Software di Gestione Specializzato',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bitora - Software di Gestione Specializzato',
    description:
      'Piattaforma verticale per la gestione operativa specializzata e dei rapportini di intervento',
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={cn('font-sans', inter.variable, fraunces.variable)}>
      <head>
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={cn(inter.className, 'antialiased')}>
        <PWAProvider>
          {children}
          <Toaster richColors position="top-center" closeButton />
          <CookieConsent />
        </PWAProvider>
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
  );
}
