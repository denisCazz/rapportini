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
  const currentLabel = RAPPORTINO_STEP_LABELS[step - 1];
  const progressPct = Math.round((step / totalSteps) * 100);

  return (
    <div className="mb-6">
      {/* Mobile: titolo step grande + barra avanzamento */}
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between">
          <p className="text-base font-semibold text-foreground">{currentLabel}</p>
          <p className="text-xs font-medium text-muted-foreground">
            Step {step} di {totalSteps}
          </p>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-center gap-2">
          {steps.map((s) => (
            <button
              key={s}
              type="button"
              disabled={!onStepClick || s > maxReachableStep || s === step}
              onClick={() => onStepClick?.(s)}
              aria-label={`Vai allo step ${RAPPORTINO_STEP_LABELS[s - 1]}`}
              aria-current={s === step ? 'step' : undefined}
              className={`h-2.5 rounded-full transition-all ${
                s === step
                  ? 'w-6 bg-primary'
                  : s < step
                    ? 'w-2.5 bg-primary/60'
                    : 'w-2.5 bg-muted'
              } ${onStepClick && s <= maxReachableStep && s !== step ? 'cursor-pointer' : 'cursor-default'}`}
            />
          ))}
        </div>
      </div>

      {/* Desktop: cerchi numerati con etichette */}
      <div className="hidden sm:block">
        <div className="flex items-center gap-2">
          {steps.map((s, idx) => (
            <div key={s} className="flex min-w-0 flex-1 items-center gap-2">
              {idx > 0 && (
                <div className={`h-0.5 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
              )}
              <button
                type="button"
                disabled={!onStepClick || s > maxReachableStep || s === step}
                onClick={() => onStepClick?.(s)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default ${
                  s < step
                    ? 'bg-primary text-primary-foreground'
                    : s === step
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                      : 'bg-muted text-muted-foreground'
                } ${onStepClick && s <= maxReachableStep && s !== step ? 'cursor-pointer hover:bg-primary/90' : ''}`}
                aria-label={`Vai allo step ${RAPPORTINO_STEP_LABELS[s - 1]}`}
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
              {idx < totalSteps - 1 && (
                <div className={`h-0.5 flex-1 rounded-full ${s < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>
        <div
          className="mt-2 grid gap-1 text-center text-xs text-muted-foreground"
          style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}
        >
          {RAPPORTINO_STEP_LABELS.map((label, i) => (
            <span
              key={label}
              className={`truncate ${i + 1 === step ? 'font-semibold text-primary' : ''}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
