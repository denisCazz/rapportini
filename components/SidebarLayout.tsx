'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AziendaSettings } from '@/types';
import { auth } from '@/lib/auth';

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

  const isActive = (path: string) => pathname === path;

  const NavContent = () => (
    <>
      <div className="relative px-5 pt-6 pb-5 border-b border-white/10">
        <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-indigo-500/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-violet-500/20 blur-2xl" />
        <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
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
          </>
        )}
      </div>

      {(onNewRapportino || onExportPDF) && (
        <div className="px-4 pb-4 space-y-2">
          {onNewRapportino && (
            <button
              onClick={() => {
                setMobileOpen(false);
                onNewRapportino();
              }}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition"
            >
              + Nuovo Rapportino
            </button>
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
        <div className="rounded-xl bg-white/5 p-3 mb-3 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white grid place-items-center text-xs font-bold shadow-lg shadow-indigo-900/30">
              {user?.nome?.charAt(0)}{user?.cognome?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-white font-medium truncate">{user?.nome} {user?.cognome}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.ruolo}</p>
            </div>
          </div>
        </div>

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
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-r border-white/10 flex flex-col shadow-2xl">
            <NavContent />
          </aside>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 dark:bg-slate-900/70 border-b border-slate-200/80 dark:border-slate-800">
          <div className="px-4 md:px-8 py-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden mt-0.5 rounded-xl border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-slate-800/80"
                aria-label="Apri menu"
              >
                ☰
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{pageTitle}</h1>
                {pageSubtitle && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{pageSubtitle}</p>}
              </div>
            </div>
            {topActions && <div className="flex items-center gap-2">{topActions}</div>}
          </div>
        </header>

        <main className="px-4 md:px-8 py-8 max-w-7xl">
          {children}
        </main>
      </div>
    </div>
  );
}
