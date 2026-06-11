'use client';

import { useState } from 'react';
import { usePWA } from '@/lib/pwa-context';
import { Button } from '@/components/ui/button';
import { Download, Share, Smartphone } from 'lucide-react';

export default function InstallPWAButton() {
  const { canInstall, showIosInstallHint, isInstalled, install } = usePWA();
  const [showIosSteps, setShowIosSteps] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (canInstall) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full justify-center gap-2"
        onClick={() => void install()}
        aria-label="Installa app Bitora"
      >
        <Download className="h-4 w-4" aria-hidden />
        Installa app
      </Button>
    );
  }

  if (showIosInstallHint) {
    return (
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center gap-2"
          onClick={() => setShowIosSteps((prev) => !prev)}
          aria-expanded={showIosSteps}
        >
          <Smartphone className="h-4 w-4" aria-hidden />
          Installa su iPhone/iPad
        </Button>
        {showIosSteps && (
          <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <Share className="h-3.5 w-3.5" aria-hidden />
              Aggiungi alla schermata Home
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>Tocca il pulsante Condividi in Safari</li>
              <li>Scegli &quot;Aggiungi a Home&quot;</li>
              <li>Conferma con Aggiungi</li>
            </ol>
          </div>
        )}
      </div>
    );
  }

  return null;
}
