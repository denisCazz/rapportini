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
  Menu,
  Moon,
  Sun,
  X,
  Home,
  FileText,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Plus,
  Calendar,
  ClipboardList,
  Bell,
  Puzzle,
  Contact,
  Package,
  Mail,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PAID_MODULES } from '@/lib/modules';
import InstallPWAButton from '@/components/InstallPWA';

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pianificazione_interventi: Calendar,
  assegnazione_lavori: ClipboardList,
  notifiche_scadenze: Bell,
  magazzino_ricambi: Package,
  report_cliente: Mail,
  preventivi: FileText,
};

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
    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
    active
      ? 'border border-primary/20 bg-primary/10 text-primary shadow-sm backdrop-blur-sm'
      : 'border border-transparent text-muted-foreground hover:border-white/40 hover:bg-white/40 hover:text-foreground hover:shadow-sm dark:hover:border-white/10 dark:hover:bg-white/5'
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
      <div className="border-b border-white/30 px-4 py-4 dark:border-white/10">
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

        {user?.ruolo === 'operatore' && (
          <>
            <p className="mt-4 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Moduli
            </p>
            {PAID_MODULES.map((modulo) => {
              const Icon = MODULE_ICONS[modulo.code] ?? FileText;
              return (
                <Link
                  key={modulo.code}
                  href={modulo.href}
                  onClick={() => setMobileOpen(false)}
                  className={navLinkClass(pathname === modulo.href || pathname.startsWith(`${modulo.href}/`))}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {modulo.nome}
                </Link>
              );
            })}
            <Link
              href="/utente/abbonamento"
              onClick={() => setMobileOpen(false)}
              className={navLinkClass(isActive('/utente/abbonamento'))}
            >
              <CreditCard className="h-4 w-4" aria-hidden />
              Abbonamento
            </Link>
          </>
        )}

        {auth.isAdmin() && (
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
            {auth.isPlatformAdmin() && (
              <Link
                href="/admin/cats"
                onClick={() => setMobileOpen(false)}
                className={navLinkClass(isActive('/admin/cats'))}
              >
                <Contact className="h-4 w-4" aria-hidden />
                Gestione CAT
              </Link>
            )}
            <Link
              href="/admin/impostazioni"
              onClick={() => setMobileOpen(false)}
              className={navLinkClass(isActive('/admin/impostazioni'))}
            >
              <Settings className="h-4 w-4" aria-hidden />
              Impostazioni
            </Link>
            {auth.isCatAdmin() && (
              <Link
                href="/admin/cat-moduli"
                onClick={() => setMobileOpen(false)}
                className={navLinkClass(isActive('/admin/cat-moduli'))}
              >
                <Puzzle className="h-4 w-4" aria-hidden />
                Moduli operatori
              </Link>
            )}
            {auth.canManageModulesAdmin() && (
              <Link
                href="/admin/moduli"
                onClick={() => setMobileOpen(false)}
                className={navLinkClass(isActive('/admin/moduli'))}
              >
                <Puzzle className="h-4 w-4" aria-hidden />
                Moduli
              </Link>
            )}
          </>
        )}
      </nav>

      {((auth.canCreateRapportini()) || onExportPDF) && (
        <div className="space-y-2 border-t border-white/30 px-3 py-3 dark:border-white/10">
          {auth.canCreateRapportini() && (
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

      <div className="border-t border-white/30 p-3 space-y-2 dark:border-white/10">
        <InstallPWAButton />

        <Button variant="outline" className="w-full justify-center gap-2" onClick={toggleDarkMode}>
          {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          {darkMode ? 'Tema scuro' : 'Tema chiaro'}
        </Button>

        <Link
          href="/utente"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-lg border border-white/40 bg-white/30 p-2 backdrop-blur-sm transition-colors hover:bg-white/60 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
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
    <div className="app-shell min-h-screen bg-background text-foreground">
      <aside className="glass-panel fixed left-0 top-0 z-20 hidden h-screen w-64 flex-col border-y-0 border-l-0 border-r lg:flex">
        <NavContent />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="glass-panel w-[min(88vw,320px)] gap-0 border-y-0 border-l-0 border-r bg-transparent p-0 lg:hidden"
        >
          <div className="flex h-full max-h-[100dvh] flex-col overflow-y-auto">
            <NavContent showCloseButton />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="glass-panel sticky top-0 z-30 border-x-0 border-t-0 border-b">
          <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="shrink-0 lg:hidden"
              aria-label="Apri menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {pageTitle}
              </h1>
              {isTestEnv() && (
                <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  TEST
                </span>
              )}
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
