'use client';

/**
 * Cohesive ember/wood palette used across all charts so the data viz matches
 * the brand tokens instead of relying on scattered hard-coded hex values.
 */
export const CHART_PALETTE = {
  pellet: '#f97316',
  legno: '#b45309',
  primary: '#ea580c',
  series: ['#f97316', '#ea580c', '#c2410c', '#b45309', '#fb923c', '#9a3412', '#d97706', '#7c2d12'],
};

/** Pellet/legno gradient definitions, rendered once per chart inside <defs>. */
export function ChartGradients() {
  return (
    <defs>
      <linearGradient id="grad-pellet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fb923c" stopOpacity={0.95} />
        <stop offset="100%" stopColor="#ea580c" stopOpacity={0.85} />
      </linearGradient>
      <linearGradient id="grad-legno" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d97706" stopOpacity={0.95} />
        <stop offset="100%" stopColor="#92400e" stopOpacity={0.85} />
      </linearGradient>
      <linearGradient id="grad-pellet-h" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#fb923c" stopOpacity={0.95} />
        <stop offset="100%" stopColor="#ea580c" stopOpacity={0.9} />
      </linearGradient>
      <linearGradient id="grad-area-pellet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
        <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
      </linearGradient>
      <linearGradient id="grad-area-legno" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#b45309" stopOpacity={0.45} />
        <stop offset="100%" stopColor="#b45309" stopOpacity={0.02} />
      </linearGradient>
    </defs>
  );
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
}

/** Frosted, theme-aware tooltip shared by every chart. */
export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/50 bg-card/90 px-3 py-2 text-xs shadow-lg backdrop-blur-md dark:border-white/10">
      {label != null && label !== '' && (
        <p className="mb-1 font-heading font-semibold text-foreground">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color || CHART_PALETTE.primary }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-heading font-semibold text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Lightweight HTML legend so swatch colors stay correct even with gradient fills. */
export function ChartLegendRow({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export const AXIS_TICK = { fontSize: 12, fill: 'var(--muted-foreground)' } as const;
export const GRID_STROKE = 'var(--border)';
