'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { auth } from '@/lib/auth';
import { parseResponseBody } from '@/lib/api';
import AuthSidePanel from '@/components/auth/AuthSidePanel';
import { OPERATOR_QUALIFICHE } from '@/lib/operator-qualifiche';

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inviteToken, setInviteToken] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [catLabel, setCatLabel] = useState('');
  const [formData, setFormData] = useState({
    partita_iva: '',
    ragione_sociale: '',
    username: '',
    password: '',
    confirmPassword: '',
    nome: '',
    cognome: '',
    telefono: '',
    email: '',
    qualifica: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    // Evita controlli multipli
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    // Se siamo sulla pagina di registrazione, significa che il middleware ci ha lasciato passare
    // Quindi NON siamo autenticati lato server (no cookie valido)
    // Puliamo il localStorage per evitare inconsistenze
    const user = auth.getUser();
    const isAuth = auth.isAuthenticated();
    
    // Se il localStorage dice che siamo autenticati ma siamo sulla pagina di register,
    // significa che il cookie è scaduto/invalido - puliamo il localStorage
    if (user || isAuth) {
      // Verifichiamo se abbiamo davvero un cookie valido facendo una chiamata API
      fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
        .then(res => {
          if (res.ok) {
            // Cookie valido, possiamo andare alla home
            router.replace('/');
          } else {
            // Cookie non valido, puliamo localStorage
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        })
        .catch(() => {
          // Errore, puliamo localStorage per sicurezza
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        });
    }
  }, [router]);

  useEffect(() => {
    const token = searchParams.get('invite')?.trim();
    if (!token) return;

    setInviteToken(token);
    setInviteLoading(true);

    fetch(`/api/public/cat-invite?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await parseResponseBody<{
          data?: { ragione_sociale?: string; partita_iva?: string };
          error?: string;
        }>(res);
        if (!res.ok) {
          setError(data?.error || 'Link di invito non valido');
          return;
        }
        setFormData((prev) => ({
          ...prev,
          partita_iva: data?.data?.partita_iva || '',
          ragione_sociale: data?.data?.ragione_sociale || '',
        }));
        setCatLabel(data?.data?.ragione_sociale || '');
      })
      .catch(() => setError('Impossibile caricare il link di invito'))
      .finally(() => setInviteLoading(false));
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validazione
    if (formData.password !== formData.confirmPassword) {
      setError('Le password non corrispondono');
      return;
    }

    if (formData.password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      return;
    }

    if (!formData.qualifica) {
      setError('Seleziona una qualifica');
      return;
    }

    if (!inviteToken && !formData.partita_iva.trim()) {
      setError('Inserisci la Partita IVA del CAT oppure usa il link di invito');
      return;
    }

    setIsLoading(true);

    try {
      const orgId = (process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || '').trim();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (orgId && !formData.partita_iva.trim()) {
        headers['X-Org-Id'] = orgId;
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          invite: inviteToken || undefined,
          partita_iva: inviteToken ? undefined : formData.partita_iva.trim() || undefined,
          ragione_sociale: inviteToken ? undefined : formData.ragione_sociale.trim() || undefined,
          username: formData.username,
          password: formData.password,
          nome: formData.nome,
          cognome: formData.cognome,
          telefono: formData.telefono,
          email: formData.email,
          qualifica: formData.qualifica,
          org_id: formData.partita_iva.trim() ? undefined : orgId || undefined,
        }),
      });

      const data = await parseResponseBody<{ error?: string }>(response);

      if (!response.ok) {
        setError(data?.error || `Errore durante la registrazione (status ${response.status})`);
        setIsLoading(false);
        return;
      }

      toast.success('Registrazione completata! Ora puoi effettuare il login.');
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
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="EVA CALÒR"
            className="mx-auto mb-6 h-20 w-auto max-w-full object-contain"
            onError={(e) => {
              // Se il logo non esiste, mostra il fallback
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
          <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-md bg-primary" style={{ display: 'none' }}>
            <span className="text-white font-bold text-5xl">E</span>
          </div>
          <div className="inline-flex items-center rounded-full border border-primary-200 dark:border-primary-800 bg-primary-50/80 dark:bg-primary-900/30 px-3 py-1 text-xs font-semibold text-primary-700 dark:text-primary-300 mb-3">
            Software di Gestione Specializzato
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Crea il tuo accesso</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {catLabel
              ? `Registrazione operatore per ${catLabel}`
              : 'Onboarding rapido per operatori della piattaforma verticale'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {inviteLoading && (
            <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
              Caricamento dati CAT dall&apos;invito...
            </div>
          )}
          {error && (
            <div className="animate-slideUp rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 flex-shrink-0 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          <div>
            <label className={labelClass}>
              Partita IVA del CAT <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.partita_iva}
              onChange={(e) => setFormData({ ...formData, partita_iva: e.target.value })}
              required={!inviteToken}
              disabled={isLoading || Boolean(inviteToken)}
              readOnly={Boolean(inviteToken)}
              className={inputClass}
              placeholder="12345678901"
              inputMode="numeric"
            />
          </div>

          <div>
            <label className={labelClass}>
              Ragione sociale CAT
            </label>
            <input
              type="text"
              value={formData.ragione_sociale}
              onChange={(e) => setFormData({ ...formData, ragione_sociale: e.target.value })}
              disabled={isLoading || Boolean(inviteToken)}
              readOnly={Boolean(inviteToken)}
              className={inputClass}
              placeholder="Assistenza Stufe S.r.l."
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
                placeholder="Nome"
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
                placeholder="Cognome"
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
              placeholder="Username"
              autoComplete="username"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={isLoading}
                  minLength={6}
                  className={`${inputClass} pr-12`}
                  placeholder="Min. 6 caratteri"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L3 12m3.29-5.71L12 12" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass}>
                Conferma Password <span className="text-red-500">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                disabled={isLoading}
                className={inputClass}
                placeholder="Conferma password"
                autoComplete="new-password"
              />
            </div>
          </div>

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
              placeholder="+39 333 1234567"
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
              placeholder="email@esempio.it"
            />
          </div>

          <div>
            <label className={labelClass}>
              Qualifica <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.qualifica}
              onChange={(e) => setFormData({ ...formData, qualifica: e.target.value })}
              required
              disabled={isLoading}
              className={inputClass}
            >
              <option value="">Seleziona qualifica</option>
              {OPERATOR_QUALIFICHE.map((qualifica) => (
                <option key={qualifica} value={qualifica}>
                  {qualifica}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Registrazione in corso...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Registrati</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center">
          <p className="text-sm text-muted-foreground">
            Hai già un account?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Accedi
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            Sei un CAT?{' '}
            <Link href="/register-cat" className="font-semibold text-primary hover:underline">
              Registra il centro assistenza
            </Link>
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-center text-xs text-muted-foreground">
            <strong>Nota:</strong> La registrazione crea un account con ruolo <strong>operatore</strong>.
            <br />
            Solo gli amministratori possono creare account admin.
          </p>
        </div>

        <div className="mt-6 text-center">
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              <a
                href="https://bitora.it"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-primary"
              >
                Bitora Software di Gestione Specializzato
              </a>
              {' è un prodotto di '}
              <a
                href="https://bitora.it"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold transition-colors hover:text-primary"
              >
                Bitora.it
              </a>
            </p>
            <p>© {new Date().getFullYear()} Bitora.it - Tutti i diritti riservati</p>
            <p>
              <Link href="/privacy" className="underline transition-colors hover:text-primary">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
          Caricamento...
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}

