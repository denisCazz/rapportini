'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import SidebarLayout from '@/components/SidebarLayout';
import SignaturePad from '@/components/SignaturePad';
import { auth } from '@/lib/auth';
import { useSettings } from '@/lib/useSettings';
import { api } from '@/lib/api';
import { OPERATOR_QUALIFICHE } from '@/lib/operator-qualifiche';
import { ExternalLink, Mail } from 'lucide-react';

interface ProfileForm {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  qualifica: string;
  firma: string;
}

export default function UtentePage() {
  const router = useRouter();
  const { settings } = useSettings();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [formData, setFormData] = useState<ProfileForm>({
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
    qualifica: '',
    firma: '',
  });

  const user = auth.getUser();
  const isOperatore = user?.ruolo === 'operatore';
  const userId = user?.id;

  const applyProfileToForm = useCallback((profile: {
    nome?: string | null;
    cognome?: string | null;
    email?: string | null;
    telefono?: string | null;
    qualifica?: string | null;
    firma?: string | null;
  }) => ({
    nome: profile.nome || '',
    cognome: profile.cognome || '',
    email: profile.email || '',
    telefono: profile.telefono || '',
    qualifica: profile.qualifica || '',
    firma: profile.firma || '',
  }), []);

  const loadProfile = useCallback(async () => {
    if (!userId) return;

    const currentUser = auth.getUser();
    if (!currentUser) return;

    try {
      setLoadingProfile(true);
      const profile = await api.getUserProfile(userId);
      setFormData(applyProfileToForm(profile));
      auth.updateUser({
        ...currentUser,
        nome: profile.nome,
        cognome: profile.cognome,
        email: profile.email || undefined,
        telefono: profile.telefono || undefined,
        qualifica: profile.qualifica || undefined,
        firma: profile.firma || undefined,
      });
    } catch (error: unknown) {
      setFormData(applyProfileToForm(currentUser));
      const message = error instanceof Error ? error.message : 'Errore nel caricamento del profilo';
      toast.error(`${message}. Mostro i dati salvati in locale.`);
    } finally {
      setLoadingProfile(false);
    }
  }, [userId, applyProfileToForm]);

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }

    setIsAuthenticated(true);
    void loadProfile();
  }, [router, loadProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const missingFields: string[] = [];
    if (!formData.nome.trim()) missingFields.push('Nome');
    if (!formData.cognome.trim()) missingFields.push('Cognome');
    if (isOperatore && !formData.qualifica.trim()) missingFields.push('Qualifica');

    if (missingFields.length > 0) {
      toast.error(`Compila i campi obbligatori: ${missingFields.join(', ')}`);
      return;
    }

    try {
      setSavingProfile(true);
      const result = await api.updateUser(user.id, {
        nome: formData.nome,
        cognome: formData.cognome,
        email: formData.email,
        telefono: formData.telefono,
        qualifica: formData.qualifica,
        firma: formData.firma,
      });

      const updated = (result.data ?? {}) as Partial<ProfileForm & { firma?: string | null }>;
      auth.updateUser({
        ...user,
        nome: updated.nome ?? formData.nome,
        cognome: updated.cognome ?? formData.cognome,
        email: (updated.email ?? formData.email) || undefined,
        telefono: (updated.telefono ?? formData.telefono) || undefined,
        qualifica: (updated.qualifica ?? formData.qualifica) || undefined,
        firma: (updated.firma ?? formData.firma) || undefined,
      });
      toast.success('Profilo aggiornato con successo');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Errore nel salvataggio del profilo';
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newPassword.length < 8) {
      toast.error('La nuova password deve avere almeno 8 caratteri');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Le password non coincidono');
      return;
    }

    try {
      setSavingPassword(true);
      await api.changePassword(user.id, { currentPassword, newPassword, confirmPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      auth.updateUser({ ...user, must_change_password: false });
      toast.success('Password aggiornata con successo');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Errore nel cambio password';
      toast.error(message);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    await auth.logout();
    router.push('/login');
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <SidebarLayout
      settings={settings}
      pageTitle="Profilo Utente"
      pageSubtitle="Gestisci i tuoi dati personali e la firma"
      onLogout={handleLogout}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        {loadingProfile ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
            <p className="mt-4 text-gray-600 dark:text-gray-300">Caricamento profilo...</p>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-md bg-primary text-lg font-semibold text-primary-foreground">
                {formData.nome?.charAt(0)}{formData.cognome?.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {formData.nome} {formData.cognome}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{user.ruolo}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Dati personali</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                  <input
                    type="text"
                    value={user.username}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cognome *</label>
                  <input
                    type="text"
                    value={formData.cognome}
                    onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefono</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Qualifica {isOperatore && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={formData.qualifica}
                    onChange={(e) => setFormData({ ...formData, qualifica: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required={isOperatore}
                  >
                    <option value="">Seleziona qualifica</option>
                    {OPERATOR_QUALIFICHE.map((qualifica) => (
                      <option key={qualifica} value={qualifica}>
                        {qualifica}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Firma operatore</h3>
              <SignaturePad
                label="Firma personale"
                value={formData.firma}
                onChange={(firma) => setFormData({ ...formData, firma })}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {savingProfile ? 'Salvataggio...' : 'Salva modifiche'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Password</h3>
            <button
              type="button"
              onClick={() => setShowPasswordForm((prev) => !prev)}
              className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400"
            >
              {showPasswordForm ? 'Annulla' : 'Cambia password'}
            </button>
          </div>
          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password attuale</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nuova password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conferma password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="md:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
                >
                  {savingPassword ? 'Aggiornamento...' : 'Aggiorna password'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Diritti privacy (GDPR)</h3>
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              type="button"
              onClick={async () => {
                try {
                  setExportingData(true);
                  const data = await api.exportMyData();
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `dati-personali-${user?.username}-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Dati esportati');
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Errore esportazione');
                } finally {
                  setExportingData(false);
                }
              }}
              disabled={exportingData}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 text-sm"
            >
              {exportingData ? 'Esportazione...' : 'Esporta i miei dati'}
            </button>
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="px-4 py-2 bg-red-600/10 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-600/20 text-sm"
            >
              Elimina account
            </button>
            <Link
              href="/privacy"
              target="_blank"
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
            >
              Privacy Policy →
            </Link>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Contatti</h3>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sito sviluppato da{' '}
              <a
                href="https://bitora.it"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                bitora.it
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </p>
            <a
              href="https://bitora.it/contattaci"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Mail className="h-4 w-4" aria-hidden />
              Contattaci
            </a>
          </div>
        </div>
      </div>

      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteModalOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Elimina account</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Questa azione disattiverà il tuo account. I dati saranno cancellati secondo la policy di retention. Se hai rapportini creati, contatta l&apos;admin per riassegnarli prima.
            </p>
            <input
              type="password"
              placeholder="Password"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-2"
            />
            <input
              type="text"
              placeholder='Scrivi ELIMINA per confermare'
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setDeleteModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">
                Annulla
              </button>
              <button
                onClick={async () => {
                  if (deleteConfirm !== 'ELIMINA') {
                    toast.error('Scrivi ELIMINA per confermare');
                    return;
                  }
                  try {
                    setDeleting(true);
                    await api.deleteMyAccount(deletePassword);
                    toast.success('Account disattivato');
                    await auth.logout();
                    router.push('/login');
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Errore');
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
