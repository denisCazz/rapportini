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
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={settings.logo || '/logo.png'}
            alt={settings.nomeAzienda || 'Bitora'}
            className="h-10 w-auto object-contain"
          />
          <div>
            <p className="text-white font-semibold leading-tight">{settings.nomeAzienda || 'Bitora'}</p>
            <p className="text-xs text-slate-400">Gestione Rapportini</p>
          </div>
        </Link>
      </div>

      <div className="p-4 space-y-2">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
            isActive('/') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-200 hover:bg-white/10'
          }`}
        >
          <span>🏠</span>
          Dashboard
        </Link>

        {user?.ruolo === 'admin' && (
          <>
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive('/admin') ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30' : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <span>📊</span>
              Statistiche
            </Link>
            <Link
              href="/admin/users"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive('/admin/users') ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <span>👥</span>
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
          <p className="text-sm text-white font-medium truncate">{user?.nome} {user?.cognome}</p>
          <p className="text-xs text-slate-400 capitalize">{user?.ruolo}</p>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/20 transition"
          >
            Esci
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-72 bg-slate-950 border-r border-white/10 flex-col">
        <NavContent />
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-slate-950 border-r border-white/10 flex flex-col">
            <NavContent />
          </aside>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
          <div className="px-4 md:px-8 py-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden mt-0.5 rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-slate-700 dark:text-slate-200"
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
