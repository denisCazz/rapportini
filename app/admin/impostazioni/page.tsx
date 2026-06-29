'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import { storage } from '@/lib/storage';
import SidebarLayout from '@/components/SidebarLayout';
import PageLoader from '@/components/ui/PageLoader';
import { Skeleton } from '@/components/ui/skeleton';
import { AziendaSettings } from '@/types';

export default function ImpostazioniPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AziendaSettings>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [formData, setFormData] = useState({
    nomeAzienda: '',
    logo: '',
    indirizzo: '',
    partitaIva: '',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    if (!auth.isAdmin()) {
      router.push('/');
      return;
    }
    setIsAuthenticated(true);
    loadSettings();
  }, [router]);

  const loadSettings = async () => {
    try {
      const local = storage.getSettings();
      setSettings(local);
      setFormData({
        nomeAzienda: local.nomeAzienda || '',
        logo: local.logo || '',
        indirizzo: local.indirizzo || '',
        partitaIva: local.partitaIva || '',
      });
      if (auth.isAuthenticated()) {
        const apiSettings = await api.getSettings();
        setFormData({
          nomeAzienda: apiSettings.nomeAzienda || '',
          logo: apiSettings.logo || '',
          indirizzo: apiSettings.indirizzo || '',
          partitaIva: apiSettings.partitaIva || '',
        });
        setSettings((prev) => ({ ...prev, ...apiSettings }));
      }
    } catch {
      toast.error('Errore nel caricamento delle impostazioni');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFormData((prev) => ({ ...prev, logo: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings(formData);
      storage.saveSettings({ ...storage.getSettings(), ...formData });
      setSettings((prev) => ({ ...prev, ...formData }));
      toast.success('Impostazioni salvate');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore nel salvataggio';
      // Se la tabella non esiste, salva comunque in localStorage
      if (msg.includes('organizzazioni non esiste') || msg.includes('TABLE_MISSING')) {
        storage.saveSettings({ ...storage.getSettings(), ...formData });
        setSettings((prev) => ({ ...prev, ...formData }));
        toast.warning('Impostazioni salvate localmente. Verifica DATABASE_URL e che la tabella organizzazioni esista (migrazioni Prisma / schema SQL).');
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    auth.logout();
    router.push('/login');
  };

  if (!isAuthenticated) return <PageLoader fullScreen message="Verifica accesso…" />;

  const inputClass =
    'w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40';
  const labelClass = 'mb-2 block text-sm font-medium text-foreground';

  return (
    <SidebarLayout
      settings={settings}
      pageTitle="Impostazioni Azienda"
      pageSubtitle="Configura nome, logo e dati dell'organizzazione"
      onLogout={handleLogout}
    >
      {loading ? (
        <div className="saas-card max-w-2xl space-y-6 p-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      ) : (
      <div className="saas-card max-w-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={labelClass}>
              Nome Azienda
            </label>
            <input
              type="text"
              value={formData.nomeAzienda}
              onChange={(e) => setFormData({ ...formData, nomeAzienda: e.target.value })}
              className={inputClass}
              placeholder="Es. EVA CALÒR"
            />
          </div>

          <div>
            <label className={labelClass}>
              Logo
            </label>
            <div className="flex items-center gap-4">
              {formData.logo && (
                <img
                  src={formData.logo}
                  alt="Logo"
                  className="h-16 w-auto rounded-lg border border-border object-contain"
                />
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  PNG, JPG. Usato in PDF e intestazioni.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Indirizzo
            </label>
            <input
              type="text"
              value={formData.indirizzo}
              onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
              className={inputClass}
              placeholder="Via Example 1, 00100 Roma"
            />
          </div>

          <div>
            <label className={labelClass}>
              Partita IVA
            </label>
            <input
              type="text"
              value={formData.partitaIva}
              onChange={(e) => setFormData({ ...formData, partitaIva: e.target.value })}
              className={inputClass}
              placeholder="IT12345678901"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
      )}
    </SidebarLayout>
  );
}
