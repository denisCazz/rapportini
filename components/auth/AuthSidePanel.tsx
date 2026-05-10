'use client';

import { Flame } from 'lucide-react';

/** Pannello laterale tema stufe / brace per login e registrazione */
export default function AuthSidePanel() {
  return (
    <div className="relative hidden lg:flex lg:w-[42%] flex-col justify-between p-10 text-white overflow-hidden bg-gradient-to-br from-stone-950 via-orange-950 to-stone-900">
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_30%_80%,rgba(251,146,60,0.35),transparent_55%)]" />
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_70%_20%,rgba(234,88,12,0.4),transparent_50%)]" />
      <div className="relative z-10 space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
          <Flame className="h-4 w-4 text-amber-300" aria-hidden />
          Bitora · Stufe pellet e legna
        </div>
        <h2 className="font-heading text-3xl font-semibold tracking-tight max-w-sm leading-tight">
          Rapportini d&apos;intervento, organizzati e pronti per il cliente.
        </h2>
        <p className="text-sm text-orange-100/80 max-w-sm">
          Firme, catalogo marche e modelli, statistiche per cliente — tutto in un unico flusso pensato per tecnici sul campo.
        </p>
      </div>
      <p className="relative z-10 text-xs text-orange-200/60">© Bitora.it</p>
    </div>
  );
}
