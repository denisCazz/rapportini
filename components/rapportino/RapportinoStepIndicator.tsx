'use client';

interface RapportinoStepIndicatorProps {
  step: number;
  maxReachableStep?: number;
  onStepClick?: (step: number) => void;
}

const LABELS = ['Operatore', 'Cliente', 'Intervento'];

export default function RapportinoStepIndicator({
  step,
  maxReachableStep = step,
  onStepClick,
}: RapportinoStepIndicatorProps) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center gap-1.5 sm:gap-3">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center flex-1 min-w-0">
            <div
              className={`flex-1 h-1.5 sm:h-2 rounded-full transition-all duration-500 ${
                s <= step ? 'bg-primary-500 shadow-glow-primary' : 'bg-surface-200 dark:bg-surface-700'
              }`}
            />
            <button
              type="button"
              disabled={!onStepClick || s > maxReachableStep || s === step}
              onClick={() => onStepClick?.(s)}
              className={`w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-2xl flex items-center justify-center font-bold text-sm sm:text-base transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-default ${
                s < step
                  ? 'bg-primary-500 text-white shadow-glow-primary scale-105'
                  : s === step
                  ? 'bg-primary-500 text-white shadow-glow-primary ring-4 ring-primary-500/30 scale-110'
                  : 'bg-surface-200 dark:bg-surface-700 text-surface-500 dark:text-surface-400'
              } ${onStepClick && s <= maxReachableStep && s !== step ? 'cursor-pointer hover:scale-105' : ''}`}
              aria-label={`Vai allo step ${LABELS[s - 1]}`}
              aria-current={s === step ? 'step' : undefined}
            >
              {s < step ? (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                s
              )}
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2.5 sm:mt-3 grid grid-cols-3 gap-0.5 sm:gap-1 text-center text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
        {LABELS.map((label, i) => (
          <span
            key={label}
            className={`truncate px-0.5 ${i + 1 === step ? 'text-primary-600 dark:text-primary-400' : ''}`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
