'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Rapportino, AziendaSettings } from '@/types';
import { auth } from '@/lib/auth';
import { api, RapportiniFilters as ApiFilters } from '@/lib/api';
import { storage } from '@/lib/storage';
import SidebarLayout from '@/components/SidebarLayout';
import RapportiniList from '@/components/RapportiniList';
import RapportiniFilters, { FilterValues } from '@/components/RapportiniFilters';
import ErrorBanner from '@/components/ui/ErrorBanner';

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
