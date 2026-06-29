'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { auth } from '@/lib/auth';
import { parseResponseBody } from '@/lib/api';
import AuthSidePanel from '@/components/auth/AuthSidePanel';

export default function RegisterCatPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    ragione_sociale: '',
    partita_iva: '',
    indirizzo: '',
    codice_fiscale: '',
    pec: '',
    codice_destinatario_sdi: '',
    username: '',
    password: '',
    confirmPassword: '',
    nome: '',
    cognome: '',
    telefono: '',
    email: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    if (auth.isAuthenticated()) {
      fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
        .then((res) => {
          if (res.ok) router.replace('/');
        })
        .catch(() => {});
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Le password non corrispondono');
      return;
    }

    if (formData.password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register-cat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ragione_sociale: formData.ragione_sociale,
          partita_iva: formData.partita_iva,
          indirizzo: formData.indirizzo,
          codice_fiscale: formData.codice_fiscale,
          pec: formData.pec,
          codice_destinatario_sdi: formData.codice_destinatario_sdi,
          username: formData.username,
          password: formData.password,
          nome: formData.nome,
          cognome: formData.cognome,
          telefono: formData.telefono,
          email: formData.email || undefined,
        }),
      });

      const data = await parseResponseBody<{ error?: string }>(response);

      if (!response.ok) {
        setError(data?.error || `Errore durante la registrazione (status ${response.status})`);
        setIsLoading(false);
        return;
      }

      toast.success('Richiesta inviata! Riceverai conferma dopo l\'approvazione dell\'amministratore.');
      router.push('/login');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore durante la registrazione');
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50';
  const labelClass = 'mb-2 block text-sm font-semibold text-foreground';

  return (
    <div className="app-shell flex min-h-screen">
      <AuthSidePanel />
      <div className="relative z-10 flex flex-1 items-center justify-center p-6">
        <div className="saas-card w-full max-w-md p-8">
          <div className="mb-8 text-center">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Registra il tuo CAT</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Centro Assistenza Tecnica — crea l&apos;organizzazione e l&apos;account amministratore
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div>
              <label className={labelClass}>
                Ragione sociale <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.ragione_sociale}
                onChange={(e) => setFormData({ ...formData, ragione_sociale: e.target.value })}
                required
                disabled={isLoading}
                className={inputClass}
                placeholder="Assistenza Stufe S.r.l."
              />
            </div>

            <div>
              <label className={labelClass}>
                Partita IVA <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.partita_iva}
                onChange={(e) => setFormData({ ...formData, partita_iva: e.target.value })}
                required
                disabled={isLoading}
                className={inputClass}
                placeholder="12345678901"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className={labelClass}>
                Indirizzo sede <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.indirizzo}
                onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
                required
                disabled={isLoading}
                className={inputClass}
                placeholder="Via Roma 1, 00100 Roma (RM)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Codice fiscale <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.codice_fiscale}
                  onChange={(e) => setFormData({ ...formData, codice_fiscale: e.target.value })}
                  required
                  disabled={isLoading}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Codice SDI <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.codice_destinatario_sdi}
                  onChange={(e) =>
                    setFormData({ ...formData, codice_destinatario_sdi: e.target.value.toUpperCase() })
                  }
                  required
                  disabled={isLoading}
                  maxLength={7}
                  className={inputClass}
                  placeholder="XXXXXXX"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>
                PEC <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.pec}
                onChange={(e) => setFormData({ ...formData, pec: e.target.value })}
                required
                disabled={isLoading}
                className={inputClass}
                placeholder="cat@pec.it"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                  disabled={isLoading}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Cognome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.cognome}
                  onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                  required
                  disabled={isLoading}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                disabled={isLoading}
                className={inputClass}
                autoComplete="username"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  disabled={isLoading}
                  className={inputClass}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Conferma <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  disabled={isLoading}
                  className={inputClass}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
              />
              Mostra password
            </label>

            <div>
              <label className={labelClass}>
                Telefono <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                required
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? 'Registrazione in corso...' : 'Registra CAT'}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
            <p>
              Hai già un account?{' '}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Accedi
              </Link>
            </p>
            <p>
              Sei un operatore?{' '}
              <Link href="/register" className="font-semibold text-primary hover:underline">
                Registrazione operatore
              </Link>
            </p>
          </div>

          <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-center text-xs text-muted-foreground">
              La registrazione crea un account <strong>admin_cat</strong> in attesa di approvazione.
              Dopo l&apos;approvazione potrai gestire operatori, condividere il link invito e attivare i moduli.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
