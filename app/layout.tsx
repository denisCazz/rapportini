import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bitora - Gestione Rapportini',
  description: 'Sistema per la gestione dei rapportini di assistenza stufe a pellet e legno',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
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
    siteName: 'Bitora',
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
      <body className={inter.className}>{children}</body>
    </html>
  )
}
