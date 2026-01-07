'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AziendaSettings } from '@/types';
import { auth } from '@/lib/auth';

interface HeaderProps {
  settings: AziendaSettings;
  onLogout?: () => void;
  onNewRapportino?: () => void;
  onExportPDF?: () => void;
}

export default function Header({ settings, onLogout, onNewRapportino, onExportPDF }: HeaderProps) {
  const user = auth.getUser();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Assicurati che il componente sia montato prima di usare createPortal
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const isActive = (path: string) => pathname === path;

  // Chiudi il menu mobile quando cambia la route
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Chiudi il menu quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMobileMenuOpen && !target.closest('.mobile-menu-container')) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);
  
  const mobileMenu = mounted && user && isMobileMenuOpen ? (
    <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[9998] md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
      <div 
        className="md:hidden mobile-menu-container fixed top-[73px] left-0 right-0 bottom-0 bg-white dark:bg-gray-800 z-[9999] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pb-4">
          <div className="space-y-1">
            {/* Info utente mobile */}
            {user && (
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {user.nome.charAt(0)}{user.cognome.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {user.nome} {user.cognome}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                      {user.ruolo}
                    </p>
                  </div>
                  {user.ruolo === 'admin' && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-semibold">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Link menu */}
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 text-base font-medium transition-colors ${
                isActive('/')
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border-l-4 border-primary-600'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </Link>
            
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onNewRapportino?.();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-base font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuovo Rapportino
            </button>
            
            {user.ruolo === 'admin' && (
              <Link
                href="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-base font-medium transition-colors ${
                  isActive('/admin')
                    ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-l-4 border-purple-600'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Admin & Statistiche
              </Link>
            )}
            
            {onExportPDF && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onExportPDF();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-base font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Esporta PDF
              </button>
            )}

            {/* Logout nel menu mobile */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
              {onLogout && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      <header className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 backdrop-blur-sm bg-white/95 dark:bg-gray-800/95">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            {settings.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logo}
                alt={settings.nomeAzienda || 'Logo Azienda'}
                className="h-12 w-auto sm:h-20 md:h-24 object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/logo.png"
                alt={settings.nomeAzienda || 'Logo Azienda'}
                className="h-12 w-auto sm:h-20 md:h-24 object-contain"
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
              <div className="h-12 w-12 sm:h-20 sm:w-20 md:h-24 md:w-24 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-lg" style={{ display: 'none' }}>
                <span className="text-white font-bold text-lg sm:text-2xl md:text-3xl">B</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {user && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
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
            
            {/* Pulsanti desktop */}
            <div className="hidden md:flex items-center gap-2">
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-2 sm:px-4 sm:py-2 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-all flex items-center gap-2 font-medium"
                  title="Logout"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">Logout</span>
                </button>
              )}
            </div>

            {/* Menu hamburger mobile */}
            {user && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                }}
                className="md:hidden p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all z-[100] relative"
                aria-label="Menu"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
        
        {/* Menu di navigazione desktop */}
        {user && (
          <nav className="hidden md:block border-t border-gray-200 dark:border-gray-700 py-2 sm:py-3">
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/"
                className={`px-2 sm:px-4 py-2 rounded-lg transition-all flex items-center gap-1 sm:gap-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  isActive('/')
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </Link>
              
              <button
                onClick={onNewRapportino}
                className="px-2 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all flex items-center gap-1 sm:gap-2 font-medium text-xs sm:text-sm shadow-md hover:shadow-lg whitespace-nowrap"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nuovo Rapportino
              </button>
              
              {user.ruolo === 'admin' && (
                <Link
                  href="/admin"
                  className={`px-2 sm:px-4 py-2 rounded-lg transition-all flex items-center gap-1 sm:gap-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                    isActive('/admin')
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Admin & Statistiche
                </Link>
              )}
              
              {onExportPDF && (
                <button
                  onClick={onExportPDF}
                  className="px-2 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1 sm:gap-2 font-medium text-xs sm:text-sm shadow-md hover:shadow-lg whitespace-nowrap"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      {mounted && createPortal(mobileMenu, document.body)}
    </>
  );
}
