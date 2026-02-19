'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Link non valido. Richiedi un nuovo reset password.');
      router.push('/login');
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (newPassword.length < 8) {
      toast.error('La password deve avere almeno 8 caratteri');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Le password non coincidono');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Errore nel reset');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      toast.success('Password aggiornata! Reindirizzamento al login...');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore di connessione');
      setIsLoading(false);
    }
  };

  if (!token) return null;

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Password aggiornata</h1>
          <p className="text-gray-600 dark:text-gray-400">Reindirizzamento al login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Nuova password</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Inserisci la nuova password (min. 8 caratteri)</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nuova password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Minimo 8 caratteri"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Conferma password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Ripeti la password"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-semibold"
          >
            {isLoading ? 'Salvataggio...' : 'Imposta password'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <Link href="/login" className="text-primary-600 dark:text-primary-400 hover:underline">
            Torna al login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
