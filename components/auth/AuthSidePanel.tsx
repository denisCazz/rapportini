'use client';

import { FileText, Users, BarChart3 } from 'lucide-react';

export default function AuthSidePanel() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-10 text-white lg:flex lg:w-[40%]">
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" aria-hidden />
      <div className="relative z-10 space-y-8">
        <div>
          <div className="mb-6 inline-flex items-center justify-center rounded-2xl bg-white/95 px-4 py-3 shadow-lg ring-1 ring-white/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="EVA CALÒR"
              className="h-12 w-auto max-w-full object-contain"
            />
          </div>
          <h2 className="mt-2 font-heading text-2xl font-bold leading-snug tracking-tight">
            Gestione rapportini d&apos;intervento per stufe pellet e legna
          </h2>
        </div>
        <ul className="space-y-4 text-sm text-white/85">
          <li className="flex items-start gap-3">
            <FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>Creazione e archiviazione rapportini con firma digitale</span>
          </li>
          <li className="flex items-start gap-3">
            <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>Catalogo clienti, marche e modelli sempre aggiornato</span>
          </li>
          <li className="flex items-start gap-3">
            <BarChart3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>Statistiche per cliente e export PDF/Excel</span>
          </li>
        </ul>
      </div>
      <p className="relative z-10 text-xs text-white/70">© EVA CALÒR</p>
    </div>
  );
}
