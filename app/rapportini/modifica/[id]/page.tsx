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
    if (auth.getUser()?.ruolo !== 'operatore') {
      toast.error('Solo gli operatori possono modificare rapportini');
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

  const handleSave = async (r: Rapportino) => {
    try {
      await api.updateRapportino(id, r);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !rapportino) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Rapportino non trovato'}</p>
          <button
            onClick={() => router.push('/rapportini')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
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
