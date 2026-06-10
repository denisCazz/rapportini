'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Rapportino, AziendaSettings } from '@/types';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import { storage } from '@/lib/storage';
import SidebarLayout from '@/components/SidebarLayout';
import RapportinoForm from '@/components/RapportinoForm';

function NuovoRapportinoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const interventoId = searchParams.get('interventoId') ?? undefined;
  const [settings, setSettings] = useState<AziendaSettings>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    if (auth.getUser()?.ruolo !== 'operatore') {
      toast.error('Solo gli operatori possono creare rapportini');
      router.push('/');
      return;
    }
    setSettings(storage.getSettings());
    api.getSettings().then((s) => setSettings((prev) => ({ ...prev, ...s }))).catch(() => {});
    setReady(true);
  }, [router]);

  const handleSave = async (rapportino: Rapportino, options?: { pendingImages?: File[] }) => {
    try {
      const result = await api.createRapportino(rapportino);
      if (options?.pendingImages?.length) {
        await api.uploadRapportinoImmagini(result.id, options.pendingImages);
      }
      if (interventoId) {
        try {
          await api.completaInterventoPianificato(interventoId);
        } catch {
          // Il rapportino è stato creato; il completamento può essere fatto manualmente
        }
      }
      toast.success('Rapportino creato');
      router.push('/rapportini');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore nel salvataggio');
      throw err;
    }
  };

  const handleCancel = () => {
    router.push('/rapportini');
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <SidebarLayout
      settings={settings}
      pageTitle="Nuovo Rapportino"
      pageSubtitle={
        interventoId
          ? 'Compila il rapportino con i dati precaricati dall\'intervento pianificato'
          : 'Compila il form per creare un nuovo rapportino'
      }
      onLogout={() => { auth.logout(); router.push('/login'); }}
    >
      <RapportinoForm
        prefillInterventoId={interventoId}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </SidebarLayout>
  );
}

export default function NuovoRapportinoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      }
    >
      <NuovoRapportinoContent />
    </Suspense>
  );
}
