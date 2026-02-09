'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const isActive = (path: string) => pathname === path;

  // Chiudi il menu mobile quando cambia la route
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Chiudi il menu utente quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (isMobileMenuOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.mobile-menu-container')) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen, isUserMenuOpen]);

  // Menu Mobile
  const mobileMenu = mounted && user && isMobileMenuOpen ? (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] md:hidden animate-fadeIn"
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <div 
        className="md:hidden mobile-menu-container fixed top-0 left-0 right-0 bottom-0 bg-white dark:bg-gray-900 z-[9999] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Mobile */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logo}
                alt={settings.nomeAzienda || 'Logo'}
                className="h-8 w-auto object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/logo.png"
                alt="Bitora - Gestione Rapportini"
                className="h-8 w-auto object-contain"
              />
            )}
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">
                {settings.nomeAzienda || 'Bitora - Gestione Rapportini'}
              </h2>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User Info Mobile */}
        {user && (
          <div className="px-4 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">
                  {user.nome.charAt(0)}{user.cognome.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {user.nome} {user.cognome}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                    {user.ruolo}
                  </span>
                  {user.ruolo === 'admin' && (
                    <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 rounded-md text-xs font-medium">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Mobile */}
        <nav className="px-4 py-4 space-y-2">
          <Link
            href="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-4 px-5 py-4 rounded-xl text-lg font-semibold transition-all ${
              isActive('/')
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </Link>
          
          {onNewRapportino && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onNewRapportino();
              }}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-lg font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg"
            >
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuovo Rapportino
            </button>
          )}
          
          {user?.ruolo === 'admin' && (
            <Link
              href="/admin"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-4 px-5 py-4 rounded-xl text-lg font-semibold transition-all ${
                isActive('/admin')
                  ? 'bg-violet-600 text-white shadow-lg'
                  : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:text-violet-600 dark:hover:text-violet-400'
              }`}
            >
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Statistiche
            </Link>
          )}
          
          {onExportPDF && !isActive('/admin') && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onExportPDF();
              }}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-lg font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-all shadow-lg"
            >
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Esporta PDF
            </button>
          )}

          {onLogout && (
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-lg font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-red-200 dark:border-red-800"
              >
                <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Esci
              </button>
            </div>
          )}
        </nav>
      </div>
    </>
  ) : null;

  return (
    <>
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-6 max-w-7xl">
          <div className="flex items-center justify-between h-16">
            {/* Logo e Brand */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Link href="/" className="flex items-center gap-3 flex-shrink-0 hover:opacity-80 transition-opacity">
                {settings.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={settings.logo}
                    alt={settings.nomeAzienda || 'Logo'}
                    className="h-9 w-auto object-contain"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src="/logo.png"
                    alt="Bitora - Gestione Rapportini"
                    className="h-9 w-auto object-contain"
                  />
                )}
                <div className="hidden sm:block">
                  <h1 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">
                    {settings.nomeAzienda || 'Bitora - Gestione Rapportini'}
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                    Software Gestionale Stufe
                  </p>
                </div>
              </Link>

              {/* Desktop Navigation */}
              {user && (
                <nav className="hidden md:flex items-center gap-2 ml-8">
                  <Link
                    href="/"
                    className={`px-4 py-2.5 rounded-lg text-base font-semibold transition-all flex items-center gap-2 ${
                      isActive('/')
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Dashboard
                  </Link>
                  
                  {onNewRapportino && (
                    <button
                      onClick={onNewRapportino}
                      className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-base font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Nuovo Rapportino
                    </button>
                  )}
                  
                  {user.ruolo === 'admin' && (
                    <Link
                      href="/admin"
                      className={`px-4 py-2.5 rounded-lg text-base font-semibold transition-all flex items-center gap-2 ${
                        isActive('/admin')
                          ? 'bg-violet-600 text-white shadow-md'
                          : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-violet-600 dark:hover:text-violet-400'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Statistiche
                    </Link>
                  )}
                  
                  {onExportPDF && !isActive('/admin') && (
                    <button
                      onClick={onExportPDF}
                      className="px-4 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-all text-base font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Esporta PDF
                    </button>
                  )}
                </nav>
              )}
            </div>

            {/* Right Side - User Menu */}
            {user && (
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Desktop User Menu */}
                <div className="hidden md:block relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                      <span className="text-white text-xs font-bold">
                        {user.nome.charAt(0)}{user.cognome.charAt(0)}
                      </span>
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                        {user.nome} {user.cognome}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {user.ruolo}
                        </span>
                        {user.ruolo === 'admin' && (
                          <span className="px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 rounded text-xs font-medium">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                    <svg 
                      className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 animate-fadeIn">
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {user.nome} {user.cognome}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {user.email || `${user.ruolo}@bitora.it`}
                        </p>
                      </div>
                      {onLogout && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onLogout();
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Esci
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Menu"
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
              </div>
            )}
          </div>
        </div>
      </header>
      {mounted && createPortal(mobileMenu, document.body)}
    </>
  );
}
