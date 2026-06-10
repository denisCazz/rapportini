'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import AuthSidePanel from '@/components/auth/AuthSidePanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [partitaIva, setPartitaIva] = useState('');
  const [ragioneSociale, setRagioneSociale] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    const user = auth.getUser();
    const isAuth = auth.isAuthenticated();

    if (user || isAuth) {
      fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
        .then((res) => {
          if (res.ok) {
            router.replace('/');
          } else {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        })
        .catch(() => {
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
    setIsLoading(true);

    try {
      const result = await auth.login(username, password, {
        partitaIva: partitaIva.trim() || undefined,
        ragioneSociale: ragioneSociale.trim() || undefined,
      });

      if (result.success && result.user) {
        if (result.user.must_change_password) {
          router.push('/change-password-required');
        } else {
          router.push('/');
        }
      } else {
        setError(result.error || 'Credenziali non valide');
        setIsLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore durante il login');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AuthSidePanel />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          {process.env.NEXT_PUBLIC_APP_ENV === 'TEST' && (
            <div className="mb-4 inline-flex rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
              Ambiente TEST
            </div>
          )}

          <div className="mb-8 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="EVA CALÒR"
              className="mx-auto mb-4 h-16 w-auto max-w-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <h1 className="text-2xl font-semibold text-foreground">Accedi a EVA CALÒR</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Inserisci le tue credenziali per continuare
            </p>
          </div>

          <div className="saas-card p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="partitaIva">Partita IVA CAT</Label>
                <Input
                  id="partitaIva"
                  type="text"
                  value={partitaIva}
                  onChange={(e) => setPartitaIva(e.target.value)}
                  disabled={isLoading}
                  placeholder="12345678901"
                  inputMode="numeric"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Obbligatoria per operatori e amministratori CAT. Lascia vuoto per accesso piattaforma.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ragioneSociale">Ragione sociale CAT</Label>
                <Input
                  id="ragioneSociale"
                  type="text"
                  value={ragioneSociale}
                  onChange={(e) => setRagioneSociale(e.target.value)}
                  disabled={isLoading}
                  placeholder="Assistenza Stufe S.r.l."
                  autoComplete="organization"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username o email</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="username@azienda.it"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    Password dimenticata?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L3 12m3.29-5.71L12 12" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Accesso in corso...' : 'Accedi'}
              </Button>
            </form>
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground space-y-2">
            <p>
              Non hai un account?{' '}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Registrati come operatore
              </Link>
            </p>
            <p>
              Sei un CAT?{' '}
              <Link href="/register-cat" className="font-medium text-primary hover:underline">
                Registra il tuo centro assistenza
              </Link>
            </p>
          </div>

          <div className="mt-8 text-center text-xs text-muted-foreground space-y-1">
            <p>
              <a href="https://bitora.it" target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                Bitora Software di Gestione Specializzato
              </a>
              {' · '}
              <a href="https://bitora.it" target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                Bitora.it
              </a>
            </p>
            <p>© {new Date().getFullYear()} Bitora.it</p>
            <Link href="/privacy" className="hover:text-primary hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
