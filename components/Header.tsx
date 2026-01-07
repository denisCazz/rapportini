'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AziendaSettings } from '@/types';
import { auth } from '@/lib/auth';

interface HeaderProps {
  settings: AziendaSettings;
  onSettingsClick: () => void;
  onLogout?: () => void;
  onNewRapportino?: () => void;
  onExportPDF?: () => void;
}

export default function Header({ settings, onSettingsClick, onLogout, onNewRapportino, onExportPDF }: HeaderProps) {
  const user = auth.getUser();
  const pathname = usePathname();
  
  const isActive = (path: string) => pathname === path;
  
  return (
    <header className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 backdrop-blur-sm bg-white/95 dark:bg-gray-800/95">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            {settings.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logo}
                alt={settings.nomeAzienda || 'Logo Azienda'}
                className="h-24 w-auto object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/logo.png"
                alt={settings.nomeAzienda || 'Logo Azienda'}
                className="h-24 w-auto object-contain"
                onError={(e) => {
                  // Se il logo non esiste, mostra il fallback
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            )}
            {!settings.logo && (
              <div className="h-24 w-24 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-lg" style={{ display: 'none' }}>
                <span className="text-white font-bold text-3xl">B</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <div className="h-8 w-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {user.nome.charAt(0)}{user.cognome.charAt(0)}
                  </span>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {user.nome} {user.cognome}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                    {user.ruolo}
                  </p>
                </div>
                {user.ruolo === 'admin' && (
                  <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-semibold">
                    Admin
                  </span>
                )}
              </div>
            )}
            <button
              onClick={onSettingsClick}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all flex items-center gap-2 font-medium"
              title="Impostazioni"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden sm:inline">Impostazioni</span>
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-all flex items-center gap-2 font-medium"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Menu di navigazione */}
        {user && (
          <nav className="border-t border-gray-200 dark:border-gray-700 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/"
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-medium text-sm ${
                  isActive('/')
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </Link>
              
              <button
                onClick={onNewRapportino}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all flex items-center gap-2 font-medium text-sm shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nuovo Rapportino
              </button>
              
              {user.ruolo === 'admin' && (
                <Link
                  href="/admin"
                  className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-medium text-sm ${
                    isActive('/admin')
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Admin & Statistiche
                </Link>
              )}
              
              {onExportPDF && (
                <button
                  onClick={onExportPDF}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 font-medium text-sm shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Esporta PDF
                </button>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
