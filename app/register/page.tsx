'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { auth } from '@/lib/auth';
import { parseResponseBody } from '@/lib/api';
import AuthSidePanel from '@/components/auth/AuthSidePanel';

const QUALIFICHE = [
  'Tecnico specializzato',
  'Tecnico installatore',
  'Tecnico manutentore',
  'Tecnico riparatore',
  'Tecnico qualificato',
  'Installatore autorizzato',
  'Manutentore autorizzato',
];

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
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

    setIsLoading(true);

    try {
      const orgId = (process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || '').trim();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (orgId) {
        headers['X-Org-Id'] = orgId;
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          nome: formData.nome,
          cognome: formData.cognome,
          telefono: formData.telefono,
          email: formData.email,
          qualifica: formData.qualifica,
          org_id: orgId || undefined,
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

  return (
    <div className="flex min-h-screen bg-background">
      <AuthSidePanel />
      <div className="flex flex-1 items-center justify-center p-6">
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Crea il tuo accesso</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Onboarding rapido per operatori della piattaforma verticale</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 animate-slideUp">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                required
                disabled={isLoading}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 transition-all disabled:opacity-50"
                placeholder="Nome"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Cognome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.cognome}
                onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                required
                disabled={isLoading}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 transition-all disabled:opacity-50"
                placeholder="Cognome"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              disabled={isLoading}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 transition-all disabled:opacity-50"
              placeholder="Username"
              autoComplete="username"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
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
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 transition-all disabled:opacity-50"
                  placeholder="Min. 6 caratteri"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Conferma Password <span className="text-red-500">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                disabled={isLoading}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 transition-all disabled:opacity-50"
                placeholder="Conferma password"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Telefono <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              required
              disabled={isLoading}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 transition-all disabled:opacity-50"
              placeholder="+39 333 1234567"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isLoading}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 transition-all disabled:opacity-50"
              placeholder="email@esempio.it"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Qualifica <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.qualifica}
              onChange={(e) => setFormData({ ...formData, qualifica: e.target.value })}
              required
              disabled={isLoading}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 transition-all disabled:opacity-50"
            >
              <option value="">Seleziona qualifica</option>
              {QUALIFICHE.map((qualifica) => (
                <option key={qualifica} value={qualifica} className="bg-white dark:bg-gray-700">
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

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Hai già un account?{' '}
            <Link href="/login" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold">
              Accedi
            </Link>
          </p>
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
            <strong>Nota:</strong> La registrazione crea un account con ruolo <strong>operatore</strong>.
            <br />
            Solo gli amministratori possono creare account admin.
          </p>
        </div>

        <div className="mt-6 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>
              <a 
                href="https://bitora.it" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                Bitora Software di Gestione Specializzato
              </a>
              {' è un prodotto di '}
              <a 
                href="https://bitora.it" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-semibold"
              >
                Bitora.it
              </a>
            </p>
            <p>© {new Date().getFullYear()} Bitora.it - Tutti i diritti riservati</p>
            <p>
              <Link href="/privacy" className="hover:text-primary-600 transition-colors underline">
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

