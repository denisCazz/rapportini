'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Rapportino, AziendaSettings } from '@/types';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import { storage } from '@/lib/storage';
import SidebarLayout from '@/components/SidebarLayout';
import RapportinoForm from '@/components/RapportinoForm';

export default function NuovoRapportinoPage() {
  const router = useRouter();
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

  const handleSave = async (rapportino: Rapportino) => {
    try {
      await api.createRapportino(rapportino);
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
      onLogout={() => { auth.logout(); router.push('/login'); }}
    >
      <RapportinoForm onSave={handleSave} onCancel={handleCancel} />
    </SidebarLayout>
  );
}
