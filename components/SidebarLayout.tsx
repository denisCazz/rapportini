'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AziendaSettings } from '@/types';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';
import InstallPWAButton from '@/components/InstallPWA';
import { isTestEnv } from '@/lib/env';

interface SidebarLayoutProps {
  settings: AziendaSettings;
  pageTitle: string;
  pageSubtitle?: string;
  children: React.ReactNode;
  onLogout?: () => void;
  onNewRapportino?: () => void;
  onExportPDF?: () => void;
  topActions?: React.ReactNode;
}

export default function SidebarLayout({
  settings,
  pageTitle,
  pageSubtitle,
  children,
  onLogout,
  onNewRapportino,
  onExportPDF,
  topActions,
}: SidebarLayoutProps) {
  const pathname = usePathname();
  const user = auth.getUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const isActive = (path: string) => pathname === path;

  useEffect(() => {
    const isDark = storage.getSettings().darkMode || false;
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileOpen]);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);

    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const currentSettings = storage.getSettings();
    storage.saveSettings({ ...currentSettings, darkMode: newDarkMode });
  };

  const NavContent = ({ showCloseButton = false }: { showCloseButton?: boolean }) => (
    <>
      <div className="relative px-5 pt-6 pb-5 border-b border-white/10">
        <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-indigo-500/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-violet-500/20 blur-2xl" />
        <div className="flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-3 min-w-0 flex-1" onClick={() => setMobileOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={settings.logo || '/logo.png'}
            alt={settings.nomeAzienda || 'Bitora'}
            className="h-10 w-auto object-contain rounded-xl"
          />
          <div>
            <p className="text-white font-semibold leading-tight tracking-tight">{settings.nomeAzienda || 'Bitora'}</p>
            <p className="text-xs text-indigo-200/80">Software di Gestione Specializzato</p>
          </div>
        </Link>
        {showCloseButton && (
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden h-10 w-10 shrink-0 grid place-items-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Chiudi menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        </div>
      </div>

      <div className="p-4 space-y-2">
        <p className="px-2 text-[11px] uppercase tracking-[0.18em] text-slate-400/80 font-semibold">Navigazione</p>
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
            isActive('/')
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-700/30'
              : 'text-slate-200 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span className={`grid h-8 w-8 place-items-center rounded-xl text-sm transition ${isActive('/') ? 'bg-white/20' : 'bg-white/10 group-hover:bg-white/20'}`}>🏠</span>
          Dashboard
        </Link>
        <Link
          href="/rapportini"
          onClick={() => setMobileOpen(false)}
          className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
            isActive('/rapportini') || pathname.startsWith('/rapportini/')
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-700/30'
              : 'text-slate-200 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span className={`grid h-8 w-8 place-items-center rounded-xl text-sm transition ${(isActive('/rapportini') || pathname.startsWith('/rapportini/')) ? 'bg-white/20' : 'bg-white/10 group-hover:bg-white/20'}`}>📋</span>
          Rapportini
        </Link>

        {user?.ruolo === 'admin' && (
          <>
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                isActive('/admin')
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-700/30'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className={`grid h-8 w-8 place-items-center rounded-xl text-sm transition ${isActive('/admin') ? 'bg-white/20' : 'bg-white/10 group-hover:bg-white/20'}`}>📊</span>
              Statistiche
            </Link>
            <Link
              href="/admin/gestione-utenti"
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                isActive('/admin/users') || isActive('/admin/gestione-utenti')
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-700/30'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className={`grid h-8 w-8 place-items-center rounded-xl text-sm transition ${(isActive('/admin/users') || isActive('/admin/gestione-utenti')) ? 'bg-white/20' : 'bg-white/10 group-hover:bg-white/20'}`}>👥</span>
              Utenti
            </Link>
            <Link
              href="/admin/impostazioni"
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                isActive('/admin/impostazioni')
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-700/30'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className={`grid h-8 w-8 place-items-center rounded-xl text-sm transition ${isActive('/admin/impostazioni') ? 'bg-white/20' : 'bg-white/10 group-hover:bg-white/20'}`}>⚙️</span>
              Impostazioni
            </Link>
          </>
        )}
      </div>

      {((user?.ruolo === 'operatore') || onExportPDF) && (
        <div className="px-4 pb-4 space-y-2">
          {user?.ruolo === 'operatore' && (
            <Link
              href="/rapportini/nuovo"
              onClick={() => setMobileOpen(false)}
              className="block w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition text-center"
            >
              + Nuovo Rapportino
            </Link>
          )}
          {onExportPDF && (
            <button
              onClick={() => {
                setMobileOpen(false);
                onExportPDF();
              }}
              className="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 transition"
            >
              Esporta PDF
            </button>
          )}
        </div>
      )}

      <div className="mt-auto px-4 pb-5">
        <InstallPWAButton />
        <button
          onClick={toggleDarkMode}
          className="w-full rounded-xl border border-slate-600/50 bg-slate-800/60 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700/70 transition-all mb-3"
          aria-label="Cambia modalità tema"
        >
          {darkMode ? '🌙 Modalità Scura' : '☀️ Modalità Chiara'}
        </button>

        <Link
          href="/utente"
          onClick={() => setMobileOpen(false)}
          className="block rounded-xl bg-white/5 p-3 mb-3 border border-white/10 hover:bg-white/10 transition"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white grid place-items-center text-xs font-bold shadow-lg shadow-indigo-900/30">
              {user?.nome?.charAt(0)}{user?.cognome?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-white font-medium truncate">{user?.nome} {user?.cognome}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.ruolo}</p>
            </div>
          </div>
        </Link>

        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/20 transition-all"
          >
            Esci
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-72 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-r border-white/10 flex-col">
        <NavContent />
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 animate-fadeIn">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="absolute left-0 top-0 h-full w-[min(85vw,320px)] max-w-[320px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-r border-white/10 flex flex-col shadow-2xl animate-slideInLeft"
            role="dialog"
            aria-label="Menu di navigazione"
          >
            <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
              <NavContent showCloseButton />
            </div>
          </aside>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 dark:bg-slate-900/70 border-b border-slate-200/80 dark:border-slate-800">
          <div className="px-4 md:px-8 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden mt-0.5 h-11 w-11 shrink-0 grid place-items-center rounded-xl bg-slate-800 dark:bg-slate-800 text-white hover:bg-slate-700 dark:hover:bg-slate-700 border border-slate-700 shadow-md active:scale-95 transition-transform"
                aria-label="Apri menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white break-words">{pageTitle}</h1>
                  {isTestEnv() && (
                    <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40">
                      TEST
                    </span>
                  )}
                </div>
                {pageSubtitle && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{pageSubtitle}</p>}
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-6 md:px-8 py-6 md:py-8 max-w-7xl mx-auto">
          {topActions && (
            <div className="mb-4 flex flex-wrap items-center gap-2 justify-start sm:justify-end">
              {topActions}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
