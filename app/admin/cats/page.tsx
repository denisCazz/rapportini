'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { fetchWithAuth, parseResponseBody } from '@/lib/api-helpers';
import SidebarLayout from '@/components/SidebarLayout';
import PageLoader from '@/components/ui/PageLoader';
import ErrorBanner from '@/components/ui/ErrorBanner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AziendaSettings } from '@/types';

interface CatRow {
  org_id: string;
  ragione_sociale: string | null;
  partita_iva: string | null;
  indirizzo: string | null;
  codice_fiscale: string | null;
  pec: string | null;
  codice_destinatario_sdi: string | null;
  stato: 'in_attesa' | 'attivo' | 'sospeso';
  stato_label: string;
  operatori_attivi: number;
  admin_cat: {
    nome: string;
    cognome: string;
    username: string;
    email: string | null;
    telefono: string | null;
  } | null;
  invite_url: string | null;
  created_at: string | null;
}

interface CatsResponse {
  data?: CatRow[];
  meta?: { total: number; in_attesa: number };
  error?: string;
}

function statoBadgeClass(stato: CatRow['stato']): string {
  if (stato === 'attivo') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  if (stato === 'in_attesa') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
}

export default function AdminCatsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AziendaSettings>({});
  const [cats, setCats] = useState<CatRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrgId, setUpdatingOrgId] = useState<string | null>(null);
  const [editingCat, setEditingCat] = useState<CatRow | null>(null);
  const [editForm, setEditForm] = useState({
    ragione_sociale: '',
    indirizzo: '',
    codice_fiscale: '',
    pec: '',
    codice_destinatario_sdi: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    if (!auth.isAuthenticated()) {
      router.push('/login');
      return;
    }
    if (!auth.isPlatformAdmin()) {
      router.push('/');
      return;
    }
    hasLoadedRef.current = true;
    setSettings(storage.getSettings());
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth('/api/admin/cats');
      const data = await parseResponseBody<CatsResponse>(response);
      if (!response.ok) {
        throw new Error(data?.error || 'Errore nel caricamento');
      }
      setCats(data?.data || []);
      setPendingCount(data?.meta?.in_attesa ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (cat: CatRow) => {
    setEditingCat(cat);
    setEditForm({
      ragione_sociale: cat.ragione_sociale || '',
      indirizzo: cat.indirizzo || '',
      codice_fiscale: cat.codice_fiscale || '',
      pec: cat.pec || '',
      codice_destinatario_sdi: cat.codice_destinatario_sdi || '',
    });
  };

  const closeEditModal = () => {
    setEditingCat(null);
    setSavingEdit(false);
  };

  const saveCatDetails = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingCat) return;

    setSavingEdit(true);
    try {
      const response = await fetchWithAuth('/api/admin/cats', {
        method: 'PATCH',
        body: JSON.stringify({
          org_id: editingCat.org_id,
          ragione_sociale: editForm.ragione_sociale,
          indirizzo: editForm.indirizzo,
          codice_fiscale: editForm.codice_fiscale,
          pec: editForm.pec,
          codice_destinatario_sdi: editForm.codice_destinatario_sdi,
        }),
      });
      const data = await parseResponseBody<{
        error?: string;
        data?: {
          ragione_sociale: string | null;
          indirizzo: string | null;
          codice_fiscale: string | null;
          pec: string | null;
          codice_destinatario_sdi: string | null;
        };
      }>(response);
      if (!response.ok) {
        throw new Error(data?.error || 'Errore nell\'aggiornamento');
      }

      const updated = data?.data;
      setCats((prev) =>
        prev.map((cat) =>
          cat.org_id === editingCat.org_id
            ? {
                ...cat,
                ragione_sociale: updated?.ragione_sociale ?? editForm.ragione_sociale,
                indirizzo: updated?.indirizzo ?? editForm.indirizzo,
                codice_fiscale: updated?.codice_fiscale ?? editForm.codice_fiscale,
                pec: updated?.pec ?? editForm.pec,
                codice_destinatario_sdi:
                  updated?.codice_destinatario_sdi ?? editForm.codice_destinatario_sdi,
              }
            : cat
        )
      );
      toast.success('Dati CAT aggiornati');
      closeEditModal();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore nell\'aggiornamento');
    } finally {
      setSavingEdit(false);
    }
  };

  const updateStato = async (orgId: string, stato: CatRow['stato']) => {
    setUpdatingOrgId(orgId);
    try {
      const response = await fetchWithAuth('/api/admin/cats', {
        method: 'PATCH',
        body: JSON.stringify({ org_id: orgId, stato }),
      });
      const data = await parseResponseBody<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.error || 'Errore nell\'aggiornamento');
      }

      setCats((prev) =>
        prev.map((cat) =>
          cat.org_id === orgId
            ? {
                ...cat,
                stato,
                stato_label:
                  stato === 'attivo'
                    ? 'Attivo'
                    : stato === 'in_attesa'
                      ? 'In attesa di approvazione'
                      : 'Sospeso',
              }
            : cat
        )
      );
      setPendingCount((prev) => {
        const cat = cats.find((c) => c.org_id === orgId);
        let count = prev;
        if (cat?.stato === 'in_attesa' && stato !== 'in_attesa') count -= 1;
        if (cat?.stato !== 'in_attesa' && stato === 'in_attesa') count += 1;
        return Math.max(0, count);
      });

      toast.success(
        stato === 'attivo'
          ? 'CAT approvato'
          : stato === 'sospeso'
            ? 'CAT sospeso'
            : 'Stato aggiornato'
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore nell\'aggiornamento');
    } finally {
      setUpdatingOrgId(null);
    }
  };

  const handleLogout = async () => {
    await auth.logout();
    router.push('/login');
  };

  const inputClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40';

  return (
    <SidebarLayout
      settings={settings}
      pageTitle="Gestione CAT"
      pageSubtitle="Approva, sospendi e monitora i Centri Assistenza Tecnica"
      onLogout={handleLogout}
    >
      {loading ? (
        <PageLoader />
      ) : error ? (
        <ErrorBanner message={error} onRetry={loadData} />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Panoramica</CardTitle>
              <CardDescription>
                {cats.length} CAT registrati
                {pendingCount > 0 ? ` · ${pendingCount} in attesa di approvazione` : ''}
              </CardDescription>
            </CardHeader>
          </Card>

          {cats.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nessun CAT registrato.
              </CardContent>
            </Card>
          ) : (
            cats.map((cat) => (
              <Card key={cat.org_id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>{cat.ragione_sociale || cat.org_id}</CardTitle>
                      <CardDescription className="mt-1 space-y-1">
                        <span className="block">P.IVA: {cat.partita_iva || '—'}</span>
                        <span className="block">CF: {cat.codice_fiscale || '—'}</span>
                        <span className="block">PEC: {cat.pec || '—'}</span>
                        <span className="block">SDI: {cat.codice_destinatario_sdi || '—'}</span>
                        <span className="block">{cat.indirizzo || '—'}</span>
                      </CardDescription>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statoBadgeClass(cat.stato)}`}>
                      {cat.stato_label}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                    <p>
                      <span className="font-medium text-foreground">Admin CAT:</span>{' '}
                      {cat.admin_cat
                        ? `${cat.admin_cat.nome} ${cat.admin_cat.cognome} (@${cat.admin_cat.username})`
                        : '—'}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Operatori attivi:</span>{' '}
                      {cat.operatori_attivi}
                    </p>
                    {cat.admin_cat?.email && (
                      <p>
                        <span className="font-medium text-foreground">Email:</span> {cat.admin_cat.email}
                      </p>
                    )}
                    {cat.admin_cat?.telefono && (
                      <p>
                        <span className="font-medium text-foreground">Telefono:</span> {cat.admin_cat.telefono}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updatingOrgId === cat.org_id}
                      onClick={() => openEditModal(cat)}
                    >
                      Modifica dati
                    </Button>
                    {cat.stato === 'in_attesa' && (
                      <Button
                        size="sm"
                        disabled={updatingOrgId === cat.org_id}
                        onClick={() => updateStato(cat.org_id, 'attivo')}
                      >
                        Approva
                      </Button>
                    )}
                    {cat.stato === 'attivo' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={updatingOrgId === cat.org_id}
                        onClick={() => updateStato(cat.org_id, 'sospeso')}
                      >
                        Sospendi
                      </Button>
                    )}
                    {cat.stato === 'sospeso' && (
                      <Button
                        size="sm"
                        disabled={updatingOrgId === cat.org_id}
                        onClick={() => updateStato(cat.org_id, 'attivo')}
                      >
                        Riattiva
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {editingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card shadow-2xl">
            <div className="p-6">
              <h2 className="mb-1 font-heading text-xl font-bold text-foreground">Modifica CAT</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                {editingCat.ragione_sociale || editingCat.org_id}
              </p>
              <form onSubmit={saveCatDetails} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Partita IVA
                  </label>
                  <input
                    type="text"
                    value={editingCat.partita_iva || ''}
                    readOnly
                    className="w-full cursor-not-allowed rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    La Partita IVA non è modificabile perché identifica il CAT nel sistema.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Ragione sociale *
                  </label>
                  <input
                    type="text"
                    value={editForm.ragione_sociale}
                    onChange={(e) => setEditForm({ ...editForm, ragione_sociale: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Indirizzo *
                  </label>
                  <input
                    type="text"
                    value={editForm.indirizzo}
                    onChange={(e) => setEditForm({ ...editForm, indirizzo: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Codice fiscale *
                  </label>
                  <input
                    type="text"
                    value={editForm.codice_fiscale}
                    onChange={(e) => setEditForm({ ...editForm, codice_fiscale: e.target.value })}
                    className={inputClass}
                    required
                    maxLength={16}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    PEC *
                  </label>
                  <input
                    type="email"
                    value={editForm.pec}
                    onChange={(e) => setEditForm({ ...editForm, pec: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Codice destinatario SDI *
                  </label>
                  <input
                    type="text"
                    value={editForm.codice_destinatario_sdi}
                    onChange={(e) =>
                      setEditForm({ ...editForm, codice_destinatario_sdi: e.target.value.toUpperCase() })
                    }
                    className={inputClass}
                    required
                    maxLength={7}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={closeEditModal} disabled={savingEdit}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={savingEdit}>
                    {savingEdit ? 'Salvataggio...' : 'Salva modifiche'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
