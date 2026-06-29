'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, type User } from '@/lib/auth';

export default function ChangePasswordRequiredPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u = auth.getUser();
    if (!u?.id) {
      router.replace('/login');
      return;
    }
    if (!u.must_change_password) {
      router.replace('/');
      return;
    }
    setUser(u);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('La nuova password deve avere almeno 8 caratteri');
      return;
    }
    if (newPassword !== confirm) {
      setError('Le password non coincidono');
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Errore');
        setLoading(false);
        return;
      }
      auth.updateUser({ ...user, must_change_password: false });
      await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
      router.replace('/');
    } catch {
      setError('Errore di rete');
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Caricamento…
      </div>
    );
  }

  const inputClass =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40';

  return (
    <div className="app-shell flex min-h-screen flex-col items-center justify-center p-4">
      <div className="saas-card relative z-10 w-full max-w-md p-8">
        <h1 className="mb-2 font-heading text-xl font-bold tracking-tight text-foreground">Cambio password obbligatorio</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Per sicurezza devi impostare una nuova password prima di usare l&apos;applicazione.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Password attuale</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nuova password (min. 8)</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Conferma nuova password</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? 'Salvataggio…' : 'Aggiorna password'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Esci e torna al login
          </Link>
        </p>
      </div>
    </div>
  );
}
