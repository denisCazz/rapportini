'use client';

import { usePWA } from '@/lib/pwa-context';

export default function InstallPWAButton() {
  const { canInstall, install } = usePWA();

  if (!canInstall) return null;

  return (
    <button
      onClick={install}
      className="w-full rounded-xl border border-slate-600/50 bg-slate-800/60 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700/70 transition-all mb-3 flex items-center justify-center gap-2"
      aria-label="Installa app"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Installa app
    </button>
  );
}
