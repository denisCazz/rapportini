'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AziendaSettings } from '@/types';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';
import InstallPWAButton from '@/components/InstallPWA';
import { isTestEnv } from '@/lib/env';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Menu, Moon, Sun, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <div className="relative px-6 pt-8 pb-6 border-b border-surface-200/70 dark:border-surface-800/70">
        <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3 min-w-0 flex-1 group" onClick={() => setMobileOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="relative">
            <div className="absolute inset-0 bg-primary-500 blur-md opacity-20 group-hover:opacity-40 transition-opacity rounded-xl"></div>
            <img
              src={settings.logo || '/logo.png'}
              alt={settings.nomeAzienda || 'Bitora'}
              className="relative h-12 w-auto object-contain rounded-xl p-1"
            />
          </div>
          <div>
            <p className="text-surface-900 dark:text-white font-bold leading-tight tracking-tight text-lg">{settings.nomeAzienda || 'Bitora'}</p>
            <p className="text-xs text-surface-500 dark:text-surface-400 font-medium">Gestione Specializzata</p>
          </div>
        </Link>
        {showCloseButton && (
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden h-10 w-10 shrink-0 grid place-items-center rounded-xl hover:bg-surface-100/70 dark:hover:bg-surface-800/70 text-surface-600 dark:text-surface-300 transition-colors"
            aria-label="Chiudi menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        </div>
      </div>

      <div className="p-4 space-y-1.5 overflow-y-auto scrollbar-hide">
        <p className="px-3 py-2 text-[10px] uppercase tracking-wider text-surface-400 dark:text-surface-500 font-bold">Menu Principale</p>
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 border-l-2 ${
            isActive('/')
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white hover:border-surface-300 dark:hover:border-surface-600'
          }`}
        >
          <span className={`grid h-8 w-8 place-items-center rounded-xl text-lg transition-transform duration-300 group-hover:scale-110`}>🏠</span>
          Dashboard
        </Link>
        <Link
          href="/rapportini"
          onClick={() => setMobileOpen(false)}
          className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 border-l-2 ${
            isActive('/rapportini') || pathname.startsWith('/rapportini/')
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white hover:border-surface-300 dark:hover:border-surface-600'
          }`}
        >
          <span className={`grid h-8 w-8 place-items-center rounded-xl text-lg transition-transform duration-300 group-hover:scale-110`}>📋</span>
          Rapportini
        </Link>

        {user?.ruolo === 'admin' && (
          <>
            <div className="pt-4 pb-2">
              <div className="h-px w-full bg-surface-200 dark:bg-surface-800"></div>
            </div>
            <p className="px-3 py-2 text-[10px] uppercase tracking-wider text-surface-400 dark:text-surface-500 font-bold">Amministrazione</p>
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 border-l-2 ${
                isActive('/admin')
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white hover:border-surface-300 dark:hover:border-surface-600'
              }`}
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl text-lg transition-transform duration-300 group-hover:scale-110">📊</span>
              Statistiche
            </Link>
            <Link
              href="/admin/gestione-utenti"
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 border-l-2 ${
                isActive('/admin/users') || isActive('/admin/gestione-utenti')
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white hover:border-surface-300 dark:hover:border-surface-600'
              }`}
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl text-lg transition-transform duration-300 group-hover:scale-110">👥</span>
              Utenti
            </Link>
            <Link
              href="/admin/impostazioni"
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 border-l-2 ${
                isActive('/admin/impostazioni')
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white hover:border-surface-300 dark:hover:border-surface-600'
              }`}
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl text-lg transition-transform duration-300 group-hover:scale-110">⚙️</span>
              Impostazioni
            </Link>
          </>
        )}
      </div>

      {((user?.ruolo === 'operatore') || onExportPDF) && (
        <div className="px-4 pb-4 space-y-3 mt-auto">
          {user?.ruolo === 'operatore' && (
            <Link
              href="/rapportini/nuovo"
              onClick={() => setMobileOpen(false)}
              className="block w-full rounded-2xl border border-primary-400/40 px-4 py-3.5 text-sm font-bold text-primary-700 dark:text-primary-300 hover:bg-primary-500/10 transition-all text-center"
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
              className="w-full rounded-2xl border border-surface-300 dark:border-surface-700 px-4 py-3.5 text-sm font-bold text-surface-700 dark:text-surface-200 hover:bg-surface-100/70 dark:hover:bg-surface-800/70 transition-all"
            >
              Esporta PDF
            </button>
          )}
        </div>
      )}

      <div className="px-4 pb-6">
        <InstallPWAButton />
        <button
          onClick={toggleDarkMode}
          className="w-full min-h-[46px] flex items-center justify-center gap-2 rounded-2xl border border-surface-200 dark:border-surface-700 px-4 py-3 text-sm font-semibold text-surface-700 dark:text-surface-300 hover:bg-surface-100/70 dark:hover:bg-surface-800/70 transition-all mb-4"
          aria-label="Cambia modalità tema"
        >
          {darkMode ? '🌙 Modalità Scura' : '☀️ Modalità Chiara'}
        </button>

        <Link
          href="/utente"
          onClick={() => setMobileOpen(false)}
          className="block rounded-2xl p-3 mb-3 border border-surface-200 dark:border-surface-700 hover:bg-surface-100/70 dark:hover:bg-surface-800/70 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white grid place-items-center text-sm font-bold shadow-md group-hover:scale-105 transition-transform">
              {user?.nome?.charAt(0)}{user?.cognome?.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-surface-900 dark:text-white font-bold truncate">{user?.nome} {user?.cognome}</p>
              <p className="text-xs text-surface-500 dark:text-surface-400 capitalize font-medium">{user?.ruolo}</p>
            </div>
          </div>
        </Link>

        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full min-h-[46px] flex items-center justify-center gap-2 rounded-2xl border border-red-300/50 dark:border-red-800/60 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-900/20 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Esci
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-50 selection:bg-primary-500/30">
      {/* Sfondo decorativo moderno */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-400/10 dark:bg-primary-600/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-400/10 dark:bg-purple-600/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-400/10 dark:bg-pink-600/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-72 flex-col z-20 border-r border-border bg-card/90 backdrop-blur-md shadow-sm">
        <NavContent />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="lg:hidden w-[min(88vw,360px)] max-w-[360px] border-r border-border bg-card/95 p-0 backdrop-blur-xl"
        >
          <div className="flex h-full max-h-[100dvh] flex-col overflow-y-auto overscroll-contain">
            <NavContent showCloseButton />
          </div>
        </SheetContent>
      </Sheet>

      <div className="lg:pl-72 flex flex-col min-h-screen relative z-10">
        <header className="sticky top-0 z-30 bg-surface-50/85 dark:bg-surface-900/85 backdrop-blur-xl border-b border-surface-200/80 dark:border-surface-800 shadow-sm">
          <div className="px-4 md:px-8 py-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden mt-0.5 h-11 w-11 shrink-0 rounded-xl border-border bg-card/80"
                aria-label="Apri menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-heading text-lg sm:text-2xl md:text-3xl font-bold text-surface-900 dark:text-white break-words tracking-tight leading-tight">
                    {pageTitle}
                  </h1>
                  {isTestEnv() && (
                    <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40">
                      TEST
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg border-border"
                      onClick={toggleDarkMode}
                      aria-label={darkMode ? 'Attiva tema chiaro' : 'Attiva tema scuro'}
                    >
                      {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                    {user && (
                      <Link
                        href="/utente"
                        aria-label="Profilo utente"
                        className={cn(
                          buttonVariants({ variant: 'outline', size: 'icon' }),
                          'h-9 w-9 rounded-lg border-border'
                        )}
                      >
                        <UserRound className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
                <Breadcrumb className="mt-2">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        className="text-muted-foreground"
                        render={<Link href="/" className="transition-colors hover:text-foreground" />}
                      >
                        Bitora
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="max-w-[12rem] truncate sm:max-w-md">{pageTitle}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                {pageSubtitle && (
                  <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-1 font-medium line-clamp-2">
                    {pageSubtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-3 sm:px-6 md:px-8 py-5 md:py-8 max-w-7xl mx-auto w-full animate-fadeIn">
          {topActions && (
            <div className="mb-5 flex flex-wrap items-center gap-3 justify-start sm:justify-end w-full">
              {topActions}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
