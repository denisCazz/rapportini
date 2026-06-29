'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';
import SidebarLayout from '@/components/SidebarLayout';
import SignaturePad from '@/components/SignaturePad';
import { api, parseResponseBody, fetchWithAuth } from '@/lib/api';
import { AziendaSettings } from '@/types';
import { OPERATOR_QUALIFICHE } from '@/lib/operator-qualifiche';

interface User {
  id: string;
  username: string;
  ruolo: 'admin' | 'admin_cat' | 'operatore';
  nome: string;
  cognome: string;
  telefono: string | null;
  email: string | null;
  qualifica: string | null;
  firma: string | null;
  attivo: boolean;
  ultimo_accesso: string | null;
  created_at: string;
  org_id?: string;
  organizzazione?: string | null;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AziendaSettings>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
    qualifica: '',
    firma: '',
    ruolo: 'operatore' as 'admin' | 'admin_cat' | 'operatore',
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const hasLoadedRef = useRef(false);
  const isCatAdminUser = auth.isCatAdmin();
  const isPlatformAdminUser = auth.isPlatformAdmin();
  const currentOrgId = auth.getUser()?.org_id;

  const isCatOrgUser = (user: User) =>
    Boolean(user.organizzazione) ||
    Boolean(user.org_id && currentOrgId && user.org_id !== currentOrgId);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    
    if (!auth.isAdmin()) {
      router.push('/');
      return;
    }
    
    hasLoadedRef.current = true;
    setIsAuthenticated(true);
    setSettings(storage.getSettings());
    loadUsers();
  }, [router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth('/api/users');
      const data = await parseResponseBody<{ data?: User[]; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.error || 'Errore nel caricamento degli utenti');
      }
      setUsers(data?.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.ruolo === 'operatore' && !formData.qualifica.trim()) {
      toast.error('La qualifica è obbligatoria per gli operatori');
      return;
    }

    setSaving(true);

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PATCH' : 'POST';

      const body = editingUser
        ? {
            nome: formData.nome,
            cognome: formData.cognome,
            email: formData.email,
            telefono: formData.telefono,
            qualifica: formData.qualifica,
            firma: formData.firma,
            ...(isCatAdminUser ? {} : { ruolo: formData.ruolo }),
          }
        : {
            ...formData,
            ruolo: isCatAdminUser ? 'operatore' : formData.ruolo,
          };

      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(body),
      });

      const data = await parseResponseBody<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(data?.error || 'Errore nel salvataggio');
      }

      setShowModal(false);
      setEditingUser(null);
      resetForm();
      loadUsers();
      toast.success(editingUser ? 'Utente aggiornato' : 'Utente creato');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Sei sicuro di voler eliminare l'utente ${user.nome} ${user.cognome}?`)) {
      return;
    }

    try {
      const response = await fetchWithAuth(`/api/users/${user.id}`, { method: 'DELETE' });
      const data = await parseResponseBody<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.error || 'Errore nell\'eliminazione');
      }
      loadUsers();
      toast.success('Utente eliminato');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore nell\'eliminazione');
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const response = await fetchWithAuth(`/api/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ attivo: !user.attivo }),
      });
      const data = await parseResponseBody<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.error || 'Errore nell\'aggiornamento');
      }
      loadUsers();
      toast.success(user.attivo ? 'Utente disattivato' : 'Utente attivato');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore nell\'aggiornamento');
    }
  };

  const handleResetPassword = async () => {
    if (!passwordUserId || !newPassword) return;

    try {
      const response = await fetchWithAuth(`/api/users/${passwordUserId}/password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });
      const data = await parseResponseBody<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.error || 'Errore nel reset password');
      }
      setShowPasswordModal(false);
      setPasswordUserId(null);
      setNewPassword('');
      toast.success('Password resettata con successo');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore nel reset password');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      nome: '',
      cognome: '',
      email: '',
      telefono: '',
      qualifica: '',
      firma: '',
      ruolo: 'operatore',
    });
  };

  const openEditModal = (user: User) => {
    if (isCatAdminUser && user.ruolo !== 'operatore') {
      toast.error('Puoi modificare solo gli operatori');
      return;
    }
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      nome: user.nome,
      cognome: user.cognome,
      email: user.email || '',
      telefono: user.telefono || '',
      qualifica: user.qualifica || '',
      firma: user.firma || '',
      ruolo: user.ruolo,
    });
    setShowModal(true);
  };

  const handleLogout = () => {
    auth.logout();
    router.push('/login');
  };

  if (!isAuthenticated) return null;

  const inputClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40';
  const labelClass = 'mb-1 block text-sm font-medium text-foreground';
  const thClass = 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground';

  return (
    <SidebarLayout
      settings={settings}
      pageTitle="Gestione Utenti"
      pageSubtitle="Crea, modifica e gestisci gli utenti del sistema"
      onLogout={handleLogout}
      topActions={
        <button
          onClick={() => { resetForm(); setEditingUser(null); setShowModal(true); }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuovo Utente
        </button>
      }
    >
      <div>
        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="saas-card p-12 text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Caricamento utenti...</p>
          </div>
        ) : (
          <div className="saas-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className={thClass}>Utente</th>
                    {isPlatformAdminUser && (
                      <th className={thClass}>Organizzazione</th>
                    )}
                    <th className={thClass}>Ruolo</th>
                    <th className={thClass}>Contatti</th>
                    <th className={thClass}>Stato</th>
                    <th className={thClass}>Ultimo Accesso</th>
                    <th className={`${thClass} text-right`}>Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => (
                    <tr key={user.id} className="transition-colors hover:bg-muted/40">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-foreground">{user.nome} {user.cognome}</div>
                          <div className="text-sm text-muted-foreground">@{user.username}</div>
                        </div>
                      </td>
                      {isPlatformAdminUser && (
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                          {user.organizzazione || 'Piattaforma'}
                        </td>
                      )}
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          user.ruolo === 'admin' || user.ruolo === 'admin_cat'
                            ? 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/20'
                            : 'bg-muted text-foreground ring-1 ring-inset ring-border'
                        }`}>
                          {user.ruolo === 'admin_cat' ? 'admin CAT' : user.ruolo}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                        <div>{user.email || '-'}</div>
                        <div>{user.telefono || '-'}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            user.attivo 
                              ? 'bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400' 
                              : 'bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20'
                          }`}
                        >
                          {user.attivo ? 'Attivo' : 'Disattivato'}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                        {user.ultimo_accesso 
                          ? format(new Date(user.ultimo_accesso), 'dd/MM/yyyy HH:mm', { locale: it })
                          : 'Mai'
                        }
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            disabled={isCatAdminUser && user.ruolo !== 'operatore'}
                            className="text-primary transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-30"
                            title="Modifica"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => { setPasswordUserId(user.id); setShowPasswordModal(true); }}
                            className="text-amber-600 transition-colors hover:text-amber-700 dark:text-amber-400"
                            title="Reset Password"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            disabled={isCatAdminUser && user.ruolo !== 'operatore'}
                            className="text-destructive transition-colors hover:text-destructive/80 disabled:cursor-not-allowed disabled:opacity-30"
                            title="Elimina"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Crea/Modifica Utente */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card shadow-2xl">
            <div className="p-6">
              <h2 className="mb-4 font-heading text-xl font-bold text-foreground">
                {editingUser ? 'Modifica Utente' : 'Nuovo Utente'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!editingUser && (
                  <>
                    <div>
                      <label className={labelClass}>Username *</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Password *</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={inputClass}
                        required
                        minLength={8}
                      />
                    </div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-4">
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
                    Qualifica {(isCatAdminUser || formData.ruolo === 'operatore') && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={formData.qualifica}
                    onChange={(e) => setFormData({ ...formData, qualifica: e.target.value })}
                    className={inputClass}
                    required={isCatAdminUser || formData.ruolo === 'operatore'}
                  >
                    <option value="">Seleziona qualifica</option>
                    {OPERATOR_QUALIFICHE.map((qualifica) => (
                      <option key={qualifica} value={qualifica}>
                        {qualifica}
                      </option>
                    ))}
                  </select>
                </div>
                {!isCatAdminUser && !(editingUser && isCatOrgUser(editingUser)) && (
                  <div>
                    <label className={labelClass}>Ruolo *</label>
                    <select
                      value={formData.ruolo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ruolo: e.target.value as 'admin' | 'admin_cat' | 'operatore',
                        })
                      }
                      className={inputClass}
                    >
                      <option value="operatore">Operatore</option>
                      {isPlatformAdminUser && <option value="admin">Admin</option>}
                    </select>
                  </div>
                )}
                {editingUser && isCatOrgUser(editingUser) && (
                  <div>
                    <label className={labelClass}>Ruolo</label>
                    <p className="text-sm text-muted-foreground">
                      {editingUser.ruolo === 'admin_cat' ? 'admin CAT' : editingUser.ruolo}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Il ruolo degli utenti CAT non può essere modificato da qui.
                      </span>
                    </p>
                  </div>
                )}
                {(isCatAdminUser || formData.ruolo === 'operatore') && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Firma operatore</label>
                    <SignaturePad
                      label="Firma"
                      value={formData.firma}
                      onChange={(firma) => setFormData({ ...formData, firma })}
                    />
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setEditingUser(null); }}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? 'Salvataggio...' : 'Salva'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
            <div className="p-6">
              <h2 className="mb-4 font-heading text-xl font-bold text-foreground">Reset Password</h2>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Nuova Password *</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                    minLength={8}
                    placeholder="Minimo 8 caratteri"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowPasswordModal(false); setPasswordUserId(null); setNewPassword(''); }}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={!newPassword || newPassword.length < 8}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    Reset Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
