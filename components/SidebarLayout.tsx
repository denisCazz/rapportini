'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AziendaSettings } from '@/types';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { isTestEnv } from '@/lib/env';
import { Sheet, SheetClose, SheetContent } from '@/components/ui/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Menu,
  Moon,
  Sun,
  X,
  UserRound,
  Home,
  FileText,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Plus,
  Contact,
} from 'lucide-react';
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

const navLinkClass = (active: boolean) =>
  cn(
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
    active
      ? 'bg-primary/10 text-primary'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  );

export default function SidebarLayout({
  settings,
  pageTitle,
  pageSubtitle,
  children,
  onLogout,
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
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-3" onClick={() => setMobileOpen(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.logo || '/logo.png'}
              alt={settings.nomeAzienda || 'EVA CALÒR'}
              className="h-10 w-auto max-w-[160px] object-contain"
            />
            <p className="min-w-0 truncate text-sm font-semibold text-foreground">
              {settings.nomeAzienda || 'EVA CALÒR'}
            </p>
          </Link>
          {showCloseButton && (
            <SheetClose
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground"
                  aria-label="Chiudi menu"
                />
              }
            >
              <X className="h-4 w-4" />
            </SheetClose>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Menu
        </p>
        <Link href="/" onClick={() => setMobileOpen(false)} className={navLinkClass(isActive('/'))}>
          <Home className="h-4 w-4" aria-hidden />
          Dashboard
        </Link>
        <Link
          href="/rapportini"
          onClick={() => setMobileOpen(false)}
          className={navLinkClass(isActive('/rapportini') || pathname.startsWith('/rapportini/'))}
        >
          <FileText className="h-4 w-4" aria-hidden />
          Rapportini
        </Link>

        {user?.ruolo === 'admin' && (
          <>
            <p className="mt-4 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Amministrazione
            </p>
            <Link href="/admin" onClick={() => setMobileOpen(false)} className={navLinkClass(isActive('/admin'))}>
              <BarChart3 className="h-4 w-4" aria-hidden />
              Statistiche
            </Link>
            <Link
              href="/admin/clienti"
              onClick={() => setMobileOpen(false)}
              className={navLinkClass(isActive('/admin/clienti'))}
            >
              <Contact className="h-4 w-4" aria-hidden />
              Clienti
            </Link>
            <Link
              href="/admin/gestione-utenti"
              onClick={() => setMobileOpen(false)}
              className={navLinkClass(isActive('/admin/users') || isActive('/admin/gestione-utenti'))}
            >
              <Users className="h-4 w-4" aria-hidden />
              Utenti
            </Link>
            <Link
              href="/admin/impostazioni"
              onClick={() => setMobileOpen(false)}
              className={navLinkClass(isActive('/admin/impostazioni'))}
            >
              <Settings className="h-4 w-4" aria-hidden />
              Impostazioni
            </Link>
          </>
        )}
      </nav>

      {((user?.ruolo === 'operatore') || onExportPDF) && (
        <div className="space-y-2 border-t border-border px-3 py-3">
          {user?.ruolo === 'operatore' && (
            <Link
              href="/rapportini/nuovo"
              onClick={() => setMobileOpen(false)}
              className={cn(
                buttonVariants({ variant: 'default' }),
                'w-full justify-center gap-2'
              )}
            >
              <Plus className="h-4 w-4" />
              Nuovo rapportino
            </Link>
          )}
          {onExportPDF && (
            <Button variant="outline" className="w-full" onClick={() => { setMobileOpen(false); onExportPDF(); }}>
              Esporta PDF
            </Button>
          )}
        </div>
      )}

      <div className="border-t border-border p-3 space-y-2">
        <Button variant="outline" className="w-full justify-center gap-2" onClick={toggleDarkMode}>
          {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          {darkMode ? 'Tema scuro' : 'Tema chiaro'}
        </Button>

        <Link
          href="/utente"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-md border border-border p-2 hover:bg-muted"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
            {user?.nome?.charAt(0)}{user?.cognome?.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {user?.nome} {user?.cognome}
            </p>
            <p className="text-xs capitalize text-muted-foreground">{user?.ruolo}</p>
          </div>
        </Link>

        {onLogout && (
          <Button variant="outline" className="w-full justify-center gap-2 text-destructive hover:text-destructive" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Esci
          </Button>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed left-0 top-0 z-20 hidden h-screen w-64 flex-col border-r border-border bg-card lg:flex">
        <NavContent />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-[min(88vw,320px)] gap-0 p-0 lg:hidden">
          <div className="flex h-full max-h-[100dvh] flex-col overflow-y-auto">
            <NavContent showCloseButton />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-card">
          <div className="flex flex-col gap-2 px-4 py-3 sm:px-6">
            <div className="flex items-start gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setMobileOpen(true)}
                className="mt-0.5 shrink-0 lg:hidden"
                aria-label="Apri menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-semibold text-foreground sm:text-xl">{pageTitle}</h1>
                  {isTestEnv() && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      TEST
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={toggleDarkMode}
                      aria-label={darkMode ? 'Attiva tema chiaro' : 'Attiva tema scuro'}
                    >
                      {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                    {user && (
                      <Link
                        href="/utente"
                        aria-label="Profilo utente"
                        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}
                      >
                        <UserRound className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
                <Breadcrumb className="mt-1">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        className="text-muted-foreground"
                        render={<Link href="/" className="hover:text-foreground" />}
                      >
                        EVA CALÒR
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="max-w-[12rem] truncate sm:max-w-md">{pageTitle}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                {pageSubtitle && (
                  <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{pageSubtitle}</p>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          {topActions && (
            <div className="mb-4 flex w-full flex-wrap items-center justify-start gap-2 sm:justify-end">
              {topActions}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
