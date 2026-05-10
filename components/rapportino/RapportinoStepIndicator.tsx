'use client';

interface RapportinoStepIndicatorProps {
  step: number;
}

const LABELS = ['Operatore', 'Cliente', 'Intervento'];

export default function RapportinoStepIndicator({ step }: RapportinoStepIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 sm:gap-3">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center flex-1 min-w-0">
            <div
              className={`flex-1 h-2 rounded-full transition-all duration-500 ${
                s <= step ? 'bg-primary-500 shadow-glow-primary' : 'bg-surface-200 dark:bg-surface-700'
              }`}
            />
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-2xl flex items-center justify-center font-bold text-sm sm:text-base transition-all duration-500 ${
                s < step
                  ? 'bg-primary-500 text-white shadow-glow-primary scale-105'
                  : s === step
                  ? 'bg-primary-500 text-white shadow-glow-primary ring-4 ring-primary-500/30 scale-110'
                  : 'bg-surface-200 dark:bg-surface-700 text-surface-500 dark:text-surface-400'
              }`}
            >
              {s < step ? (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                s
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
        {LABELS.map((label, i) => (
          <span key={label} className={i + 1 === step ? 'text-primary-600 dark:text-primary-400' : ''}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
