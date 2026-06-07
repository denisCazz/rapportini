'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import AuthSidePanel from '@/components/auth/AuthSidePanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';

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

  const formCard = sent ? (
    <Card className="w-full max-w-md border-border shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
          <Mail className="h-7 w-7 text-primary" aria-hidden />
        </div>
        <CardTitle>Controlla la tua email</CardTitle>
        <CardDescription>
          Se un account è associato a <strong className="text-foreground">{email}</strong>, riceverai un link per
          reimpostare la password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/login" className={cn(buttonVariants(), 'inline-flex w-full justify-center')}>
          Torna al login
        </Link>
      </CardContent>
    </Card>
  ) : (
    <Card className="w-full max-w-md border-border shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Password dimenticata</CardTitle>
        <CardDescription>
          Inserisci l&apos;email o lo username del tuo account. Ti invieremo un link per reimpostare la password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email o username</Label>
            <Input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              placeholder="email@esempio.it o username"
              autoComplete="username"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Invio...' : 'Invia link reset'}
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
    <div className="relative min-h-screen flex overflow-hidden bg-background">
      <AuthSidePanel />
      <div className="relative flex flex-1 items-center justify-center p-6">
        <div className="w-full flex justify-center">{formCard}</div>
      </div>
    </div>
  );
}
