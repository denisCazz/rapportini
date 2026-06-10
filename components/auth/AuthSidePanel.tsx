'use client';

import { FileText, Users, BarChart3 } from 'lucide-react';

export default function AuthSidePanel() {
  return (
    <div className="hidden lg:flex lg:w-[40%] flex-col justify-between bg-primary-700 p-10 text-white">
      <div className="space-y-8">
        <div>
          <div className="mb-6 inline-block rounded-lg bg-white px-4 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="EVA CALÒR"
              className="h-12 w-auto max-w-full object-contain"
            />
          </div>
          <h2 className="mt-2 text-2xl font-semibold leading-snug">EVA CALÒR</h2>
        </div>
        <ul className="space-y-4 text-sm text-primary-100">
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
      <p className="text-xs text-primary-200">© EVA CALÒR</p>
    </div>
  );
}
