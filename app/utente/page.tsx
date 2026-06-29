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

  const inputClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40';
  const labelClass = 'mb-1 block text-sm font-medium text-foreground';
  const sectionTitleClass = 'mb-4 font-heading text-base font-semibold text-foreground';

  return (
    <SidebarLayout
      settings={settings}
      pageTitle="Profilo Utente"
      pageSubtitle="Gestisci i tuoi dati personali e la firma"
      onLogout={handleLogout}
    >
      <div className="saas-card p-6">
        {loadingProfile ? (
          <div className="py-12 text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
            <p className="mt-4 text-muted-foreground">Caricamento profilo...</p>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-700 font-heading text-lg font-bold text-primary-foreground shadow-sm">
                {formData.nome?.charAt(0)}{formData.cognome?.charAt(0)}
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
                  {formData.nome} {formData.cognome}
                </h2>
                <p className="text-sm capitalize text-muted-foreground">{user.ruolo}</p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h3 className={sectionTitleClass}>Dati personali</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Username</label>
                  <input
                    type="text"
                    value={user.username}
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
                  />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Nome *</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Cognome *</label>
                  <input
                    type="text"
                    value={formData.cognome}
                    onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Telefono</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Qualifica {isOperatore && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={formData.qualifica}
                    onChange={(e) => setFormData({ ...formData, qualifica: e.target.value })}
                    className={inputClass}
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

            <div className="border-t border-border pt-4">
              <h3 className="mb-3 font-heading text-base font-semibold text-foreground">Firma operatore</h3>
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
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {savingProfile ? 'Salvataggio...' : 'Salva modifiche'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 border-t border-border pt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-heading text-base font-semibold text-foreground">Password</h3>
            <button
              type="button"
              onClick={() => setShowPasswordForm((prev) => !prev)}
              className="text-sm font-medium text-primary hover:underline"
            >
              {showPasswordForm ? 'Annulla' : 'Cambia password'}
            </button>
          </div>
          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Password attuale</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={inputClass}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className={labelClass}>Nuova password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className={labelClass}>Conferma password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="md:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {savingPassword ? 'Aggiornamento...' : 'Aggiorna password'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <h3 className={sectionTitleClass}>Diritti privacy (GDPR)</h3>
          <div className="mb-6 flex flex-wrap gap-3">
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
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              {exportingData ? 'Esportazione...' : 'Esporta i miei dati'}
            </button>
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
            >
              Elimina account
            </button>
            <Link
              href="/privacy"
              target="_blank"
              className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy Policy →
            </Link>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <h3 className="mb-3 font-heading text-base font-semibold text-foreground">Contatti</h3>
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">
              Sito sviluppato da{' '}
              <a
                href="https://bitora.it"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                bitora.it
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </p>
            <a
              href="https://bitora.it/contattaci"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Mail className="h-4 w-4" aria-hidden />
              Contattaci
            </a>
          </div>
        </div>
      </div>

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setDeleteModalOpen(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="mb-2 font-heading text-lg font-bold text-foreground">Elimina account</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Questa azione disattiverà il tuo account. I dati saranno cancellati secondo la policy di retention. Se hai rapportini creati, contatta l&apos;admin per riassegnarli prima.
            </p>
            <input
              type="password"
              placeholder="Password"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              className="mb-2 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <input
              type="text"
              placeholder='Scrivi ELIMINA per confermare'
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              className="mb-4 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <div className="flex gap-2">
              <button onClick={() => setDeleteModalOpen(false)} className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
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
                className="flex-1 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-destructive/90 disabled:opacity-50"
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
