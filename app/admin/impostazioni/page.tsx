'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import { storage } from '@/lib/storage';
import SidebarLayout from '@/components/SidebarLayout';
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

  if (!isAuthenticated || loading) return null;

  return (
    <SidebarLayout
      settings={settings}
      pageTitle="Impostazioni Azienda"
      pageSubtitle="Configura nome, logo e dati dell'organizzazione"
      onLogout={handleLogout}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome Azienda
            </label>
            <input
              type="text"
              value={formData.nomeAzienda}
              onChange={(e) => setFormData({ ...formData, nomeAzienda: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Es. Bitora - Gestione Rapportini"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Logo
            </label>
            <div className="flex items-center gap-4">
              {formData.logo && (
                <img
                  src={formData.logo}
                  alt="Logo"
                  className="h-16 w-auto object-contain rounded-lg border border-gray-200 dark:border-gray-600"
                />
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 dark:file:bg-primary-900/30 dark:file:text-primary-300"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG. Usato in PDF e intestazioni.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Indirizzo
            </label>
            <input
              type="text"
              value={formData.indirizzo}
              onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Via Example 1, 00100 Roma"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Partita IVA
            </label>
            <input
              type="text"
              value={formData.partitaIva}
              onChange={(e) => setFormData({ ...formData, partitaIva: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="IT12345678901"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </SidebarLayout>
  );
}
