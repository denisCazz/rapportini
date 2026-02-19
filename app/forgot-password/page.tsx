'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Inserisci email o username');
      return;
    }

    setIsLoading(true);
    try {
      const orgId = (process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || '').trim();
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          org_id: orgId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Errore nella richiesta');
        setIsLoading(false);
        return;
      }

      setSent(true);
      toast.success(data.message || 'Controlla la tua email');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore di connessione');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-gray-200 dark:border-gray-700">
          <div className="h-16 w-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Controlla la tua email</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Se un account è associato a <strong>{email}</strong>, riceverai un link per reimpostare la password.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold"
          >
            Torna al login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Password dimenticata</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Inserisci l&apos;email o lo username del tuo account. Ti invieremo un link per reimpostare la password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email o username</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="email@esempio.it o username"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-semibold"
          >
            {isLoading ? 'Invio...' : 'Invia link reset'}
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
