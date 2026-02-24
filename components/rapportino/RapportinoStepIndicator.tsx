'use client';

interface RapportinoStepIndicatorProps {
  step: number;
}

export default function RapportinoStepIndicator({ step }: RapportinoStepIndicatorProps) {
  return (
    <div className="flex items-center gap-3 mb-8">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center flex-1">
          <div
            className={`flex-1 h-2 rounded-full transition-all duration-500 ${
              s <= step ? 'bg-primary-500 shadow-glow-primary' : 'bg-surface-200 dark:bg-surface-700'
            }`}
          />
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base transition-all duration-500 ${
              s < step
                ? 'bg-primary-500 text-white shadow-glow-primary scale-105'
                : s === step
                ? 'bg-primary-500 text-white shadow-glow-primary ring-4 ring-primary-500/30 scale-110'
                : 'bg-surface-200 dark:bg-surface-700 text-surface-500 dark:text-surface-400'
            }`}
          >
            {s < step ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              s
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
