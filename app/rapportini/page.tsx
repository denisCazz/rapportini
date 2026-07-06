'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Rapportino, AziendaSettings } from '@/types';
import { auth } from '@/lib/auth';
import { api, RapportiniFilters as ApiFilters } from '@/lib/api';
import { storage } from '@/lib/storage';
import SidebarLayout from '@/components/SidebarLayout';
import RapportiniList from '@/components/RapportiniList';
import RapportiniFilters, { FilterValues } from '@/components/RapportiniFilters';
import ErrorBanner from '@/components/ui/ErrorBanner';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function RapportiniSearchPage() {
  const router = useRouter();
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [settings, setSettings] = useState<AziendaSettings>({});
  const [filters, setFilters] = useState<FilterValues>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    hasLoadedRef.current = true;
    const loadedSettings = storage.getSettings();
    setSettings(loadedSettings);
    api.getSettings().then((s) => setSettings((prev) => ({ ...prev, ...s }))).catch(() => {});
  }, []);

  useEffect(() => {
    if (hasLoadedRef.current) {
      loadRapportini(filters);
    }
  }, [filters]);

  const loadRapportini = async (f: FilterValues) => {
    try {
      setLoading(true);
      setError(null);
      const apiFilters: ApiFilters = {
        ...f,
        limit: 50,
      };
      const data = await api.getRapportini(apiFilters);
      setRapportini(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteRapportino(id);
      toast.success('Rapportino eliminato');
      loadRapportini(filters);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore nell\'eliminazione');
    }
  };

  const handleEdit = (r: Rapportino) => {
    router.push(`/rapportini/modifica/${r.id}`);
  };

  const handleLogout = () => {
    auth.logout();
    router.push('/login');
  };

  const canCreateRapportini = auth.canCreateRapportini();
  const canEditRapportini = canCreateRapportini || auth.isAdmin();

  if (!hasLoadedRef.current && !auth.isAuthenticated()) {
    return null;
  }

  return (
    <SidebarLayout
      settings={settings}
      pageTitle="Rapportini"
      pageSubtitle="Cerca e gestisci i rapportini"
      onLogout={handleLogout}
    >
      {canCreateRapportini && (
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br from-primary/20 via-primary/5 to-white/10 p-6 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.18)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:from-primary/25 dark:via-white/[0.04] dark:to-white/[0.02] sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/30 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" aria-hidden />
          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Azione rapida</p>
              <h2 className="mt-1 font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">Nuovo rapportino</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Compila e invia un nuovo rapportino di intervento in pochi passaggi.
              </p>
            </div>
            <Link
              href="/rapportini/nuovo"
              className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'w-full justify-center gap-2 sm:w-auto')}
            >
              <Plus className="h-5 w-5" />
              Nuovo rapportino
            </Link>
          </div>
        </div>
      )}

      <RapportiniFilters onFilterChange={handleFilterChange} initialFilters={filters} />

      {error && <ErrorBanner message={error} onRetry={() => loadRapportini(filters)} />}

      <RapportiniList
        rapportini={rapportini}
        loading={loading}
        onDelete={handleDelete}
        onEdit={canEditRapportini ? handleEdit : undefined}
        settings={settings}
        showCreateAction={canCreateRapportini}
      />
    </SidebarLayout>
  );
}
