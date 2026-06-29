'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import AuthSidePanel from '@/components/auth/AuthSidePanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2 } from 'lucide-react';

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

  const inner = success ? (
    <Card className="w-full max-w-md border-border shadow-xl text-center">
      <CardHeader>
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
          <CheckCircle2 className="h-8 w-8 text-primary" aria-hidden />
        </div>
        <CardTitle className="font-heading">Password aggiornata</CardTitle>
        <CardDescription>Reindirizzamento al login...</CardDescription>
      </CardHeader>
    </Card>
  ) : (
    <Card className="w-full max-w-md border-border shadow-xl">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Nuova password</CardTitle>
        <CardDescription>Inserisci la nuova password (min. 8 caratteri)</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nuova password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              disabled={isLoading}
              placeholder="Minimo 8 caratteri"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Conferma password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              disabled={isLoading}
              placeholder="Ripeti la password"
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Salvataggio...' : 'Imposta password'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline font-medium">
            Torna al login
          </Link>
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="app-shell relative flex min-h-screen overflow-hidden">
      <AuthSidePanel />
      <div className="relative z-10 flex flex-1 items-center justify-center p-6">
        <div className="relative z-10 w-full flex justify-center">{inner}</div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen flex overflow-hidden bg-background">
          <AuthSidePanel />
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
