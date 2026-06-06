'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const STORAGE_KEY = 'cookie_consent_accepted';

export default function CookieConsent() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const isRapportinoForm =
    pathname?.startsWith('/rapportini/nuovo') || pathname?.startsWith('/rapportini/modifica');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const accepted = localStorage.getItem(STORAGE_KEY);
    if (!accepted) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed left-0 right-0 z-40 p-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur border-t border-gray-200 dark:border-gray-700 shadow-lg ${
        isRapportinoForm
          ? 'bottom-[calc(11rem+env(safe-area-inset-bottom,0px))] sm:bottom-0'
          : 'bottom-0 pb-[max(1rem,env(safe-area-inset-bottom))]'
      }`}
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Utilizziamo cookie tecnici necessari per l&apos;autenticazione e il funzionamento della piattaforma.
          Non utilizziamo cookie di profilazione.{' '}
          <Link href="/privacy" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
            Privacy Policy
          </Link>
        </p>
        <button
          onClick={handleAccept}
          className="shrink-0 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
        >
          Ho capito
        </button>
      </div>
    </div>
  );
}
