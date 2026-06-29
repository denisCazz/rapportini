'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Rapportino, AziendaSettings } from '@/types';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import { storage } from '@/lib/storage';
import SidebarLayout from '@/components/SidebarLayout';
import RapportinoForm from '@/components/RapportinoForm';

export default function ModificaRapportinoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [rapportino, setRapportino] = useState<Rapportino | null>(null);
  const [settings, setSettings] = useState<AziendaSettings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    if (!auth.canCreateRapportini() && !auth.isAdmin()) {
      toast.error('Non hai i permessi per modificare rapportini');
      router.push('/rapportini');
      return;
    }
    setSettings(storage.getSettings());
    api.getSettings().then((s) => setSettings((prev) => ({ ...prev, ...s }))).catch(() => {});

    const load = async () => {
      try {
        const data = await api.getRapportino(id);
        setRapportino(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Errore nel caricamento');
        toast.error('Rapportino non trovato');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, router]);

  const handleSave = async (r: Rapportino, options?: { pendingImages?: File[] }) => {
    try {
      await api.updateRapportino(id, r);
      if (options?.pendingImages?.length) {
        await api.uploadRapportinoImmagini(id, options.pendingImages);
      }
      toast.success('Rapportino aggiornato');
      router.push('/rapportini');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore nel salvataggio');
      throw err;
    }
  };

  const handleCancel = () => {
    router.push('/rapportini');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (error || !rapportino) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="saas-card w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="mb-2 font-heading text-lg font-bold text-foreground">Errore</p>
          <p className="text-surface-600 dark:text-surface-400 mb-6">{error || 'Rapportino non trovato'}</p>
          <button
            onClick={() => router.push('/rapportini')}
            className="w-full rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Torna ai rapportini
          </button>
        </div>
      </div>
    );
  }

  return (
    <SidebarLayout
      settings={settings}
      pageTitle="Modifica Rapportino"
      pageSubtitle={`Modifica rapportino del ${rapportino.intervento.data}`}
      onLogout={() => { auth.logout(); router.push('/login'); }}
    >
      <RapportinoForm
        initialRapportino={rapportino}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </SidebarLayout>
  );
}
