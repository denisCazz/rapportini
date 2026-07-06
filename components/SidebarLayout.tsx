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
  MapPin,
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
  planner: MapPin,
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
    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
    active
      ? 'bg-gradient-to-r from-primary/15 via-primary/10 to-transparent text-primary'
      : 'text-muted-foreground hover:bg-white/55 hover:text-foreground dark:hover:bg-white/[0.06]'
  );

const navIconClass = (active: boolean) =>
  cn(
    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
    active
      ? 'bg-primary text-primary-foreground shadow-sm'
      : 'bg-white/60 text-muted-foreground group-hover:text-foreground dark:bg-white/[0.06]'
  );

const sectionLabelClass =
  'mb-1 mt-5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70 first:mt-0';

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

  const NavItem = ({
    href,
    icon: Icon,
    label,
    active,
  }: {
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    active: boolean;
  }) => (
    <Link href={href} onClick={() => setMobileOpen(false)} className={navLinkClass(active)}>
      {active && (
        <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-primary" aria-hidden />
      )}
      <span className={navIconClass(active)}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  );

  const NavContent = ({ showCloseButton = false }: { showCloseButton?: boolean }) => (
    <>
      <div className="border-b border-white/30 px-4 py-4 dark:border-white/10">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-3" onClick={() => setMobileOpen(false)}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/50 bg-white/70 shadow-sm dark:border-white/10 dark:bg-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings.logo || '/logo.png'}
                alt={settings.nomeAzienda || 'EVA CALÒR'}
                className="h-8 w-auto max-w-[36px] object-contain"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-heading text-sm font-bold leading-tight text-foreground">
                {settings.nomeAzienda || 'EVA CALÒR'}
              </span>
              <span className="block truncate text-[11px] font-medium text-muted-foreground">
                Gestione rapportini
              </span>
            </span>
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

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        <p className={sectionLabelClass}>Menu</p>
        <NavItem href="/" icon={Home} label="Dashboard" active={isActive('/')} />
        <NavItem
          href="/rapportini"
          icon={FileText}
          label="Rapportini"
          active={isActive('/rapportini') || pathname.startsWith('/rapportini/')}
        />

        {user?.ruolo === 'operatore' && (
          <>
            <p className={sectionLabelClass}>Moduli</p>
            {PAID_MODULES.map((modulo) => (
              <NavItem
                key={modulo.code}
                href={modulo.href}
                icon={MODULE_ICONS[modulo.code] ?? FileText}
                label={modulo.nome}
                active={pathname === modulo.href || pathname.startsWith(`${modulo.href}/`)}
              />
            ))}
            <NavItem
              href="/utente/abbonamento"
              icon={CreditCard}
              label="Abbonamento"
              active={isActive('/utente/abbonamento')}
            />
          </>
        )}

        {auth.isAdmin() && (
          <>
            <p className={sectionLabelClass}>Amministrazione</p>
            <NavItem href="/admin" icon={BarChart3} label="Statistiche" active={isActive('/admin')} />
            <NavItem href="/admin/clienti" icon={Contact} label="Clienti" active={isActive('/admin/clienti')} />
            <NavItem
              href="/admin/gestione-utenti"
              icon={Users}
              label="Utenti"
              active={isActive('/admin/users') || isActive('/admin/gestione-utenti')}
            />
            {auth.isPlatformAdmin() && (
              <NavItem href="/admin/cats" icon={Contact} label="Gestione CAT" active={isActive('/admin/cats')} />
            )}
            <NavItem
              href="/admin/impostazioni"
              icon={Settings}
              label="Impostazioni"
              active={isActive('/admin/impostazioni')}
            />
            {auth.isCatAdmin() && (
              <NavItem
                href="/admin/cat-moduli"
                icon={Puzzle}
                label="Moduli operatori"
                active={isActive('/admin/cat-moduli')}
              />
            )}
            {auth.canManageModulesAdmin() && (
              <NavItem href="/admin/moduli" icon={Puzzle} label="Moduli" active={isActive('/admin/moduli')} />
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
          className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/40 p-2 backdrop-blur-sm transition-colors hover:bg-white/65 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-700 font-heading text-xs font-bold text-primary-foreground shadow-sm">
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
    <div className="app-shell">
      <aside className="glass-panel fixed left-0 top-0 z-20 hidden h-screen w-64 flex-col border-y-0 border-l-0 border-r lg:flex">
        <NavContent />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="glass-panel w-[min(88vw,320px)] gap-0 border-y-0 border-l-0 border-r p-0 lg:hidden !bg-[rgba(255,255,255,0.24)] dark:!bg-[rgba(255,255,255,0.05)]"
        >
          <div className="flex h-full max-h-[100dvh] flex-col overflow-y-auto">
            <NavContent showCloseButton />
          </div>
        </SheetContent>
      </Sheet>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="glass-panel sticky top-0 z-30 border-x-0 border-t-0 border-b">
          <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6 lg:pl-72">
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
              <h1 className="truncate font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
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

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:pl-72">
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
