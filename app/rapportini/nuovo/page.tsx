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
import { enqueueRapportino } from '@/lib/offline-queue';
import { isNetworkFailure, registerBackgroundSync } from '@/lib/offline-sync';
import { usePWA } from '@/lib/pwa-context';

function NuovoRapportinoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const interventoId = searchParams.get('interventoId') ?? undefined;
  const { refreshPendingCount } = usePWA();
  const [settings, setSettings] = useState<AziendaSettings>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    if (!auth.canCreateRapportini()) {
      toast.error('Non hai i permessi per creare rapportini');
      router.push('/');
      return;
    }
    setSettings(storage.getSettings());
    api.getSettings().then((s) => setSettings((prev) => ({ ...prev, ...s }))).catch(() => {});
    setReady(true);
  }, [router]);

  const saveOffline = async (rapportino: Rapportino, options?: { pendingImages?: File[] }) => {
    await enqueueRapportino(rapportino, {
      pendingImages: options?.pendingImages,
      interventoId,
    });
    await registerBackgroundSync();
    await refreshPendingCount();
    router.replace('/rapportini');
    return 'offline' as const;
  };

  const handleSave = async (
    rapportino: Rapportino,
    options?: { pendingImages?: File[] }
  ): Promise<'offline' | 'online'> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return saveOffline(rapportino, options);
    }

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
      router.replace('/rapportini');
      return 'online';
    } catch (err: unknown) {
      if (isNetworkFailure(err)) {
        return saveOffline(rapportino, options);
      }
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
