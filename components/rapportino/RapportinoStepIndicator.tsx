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
    <div className="mb-6">
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-1 min-w-0 items-center gap-2">
            <div
              className={`h-1 flex-1 rounded-full ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
            <button
              type="button"
              disabled={!onStepClick || s > maxReachableStep || s === step}
              onClick={() => onStepClick?.(s)}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default ${
                s <= step
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              } ${onStepClick && s <= maxReachableStep && s !== step ? 'cursor-pointer hover:bg-primary/90' : ''}`}
              aria-label={`Vai allo step ${LABELS[s - 1]}`}
              aria-current={s === step ? 'step' : undefined}
            >
              {s < step ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                s
              )}
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-xs text-muted-foreground">
        {LABELS.map((label, i) => (
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
