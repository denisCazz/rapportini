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
      <div className="min-h-screen flex items-center justify-center bg-stone-950 text-stone-300">
        Caricamento…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="saas-card w-full max-w-md p-8">
        <h1 className="mb-2 text-xl font-semibold text-foreground">Cambio password obbligatorio</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Per sicurezza devi impostare una nuova password prima di usare l&apos;applicazione.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-950/50 border border-red-800/50 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">Password attuale</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">Nuova password (min. 8)</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">Conferma nuova password</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100"
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-60"
          >
            {loading ? 'Salvataggio…' : 'Aggiorna password'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-stone-500">
          <Link href="/login" className="text-amber-600/80 hover:text-amber-500">
            Esci e torna al login
          </Link>
        </p>
      </div>
    </div>
  );
}
