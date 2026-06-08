'use client';

export const RAPPORTINO_STEP_LABELS = [
  'Operatore',
  'Tipologia',
  'Cliente',
  'Intervento',
  'Firme',
] as const;

interface RapportinoStepIndicatorProps {
  step: number;
  totalSteps?: number;
  maxReachableStep?: number;
  onStepClick?: (step: number) => void;
}

export default function RapportinoStepIndicator({
  step,
  totalSteps = RAPPORTINO_STEP_LABELS.length,
  maxReachableStep = step,
  onStepClick,
}: RapportinoStepIndicatorProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-1 sm:gap-2">
        {steps.map((s) => (
          <div key={s} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
            <div className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
            <button
              type="button"
              disabled={!onStepClick || s > maxReachableStep || s === step}
              onClick={() => onStepClick?.(s)}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default sm:h-8 sm:w-8 sm:text-sm ${
                s <= step
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              } ${onStepClick && s <= maxReachableStep && s !== step ? 'cursor-pointer hover:bg-primary/90' : ''}`}
              aria-label={`Vai allo step ${RAPPORTINO_STEP_LABELS[s - 1]}`}
              aria-current={s === step ? 'step' : undefined}
            >
              {s < step ? (
                <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                s
              )}
            </button>
          </div>
        ))}
      </div>
      <div
        className="mt-2 grid gap-1 text-center text-[10px] text-muted-foreground sm:text-xs"
        style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}
      >
        {RAPPORTINO_STEP_LABELS.map((label, i) => (
          <span
            key={label}
            className={`truncate ${i + 1 === step ? 'font-medium text-primary' : ''}`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
