import { formatMoney } from '../lib/format';
import type { BudgetProgress, BudgetStatus } from '../lib/stats';

const BAR = { ok: 'bg-brand', warn: 'bg-warn', over: 'bg-loss' } as const;
const TEXT = {
  ok: 'text-muted',
  warn: 'text-warn font-medium',
  over: 'text-loss font-semibold',
} as const;

/**
 * Screen-reader text for a budget bar. aria-valuenow is capped at 100 (a value above aria-valuemax
 * is invalid), so the money figures carry the real state, including how far over the limit it is.
 */
function valueText(spent: number, limit: number) {
  const base = `${formatMoney(spent)} of ${formatMoney(limit)} spent`;
  return spent > limit ? `${base}, over by ${formatMoney(spent - limit)}` : base;
}

export function BudgetBar({ p }: { p: BudgetProgress }) {
  const width = Math.min(100, p.pct * 100);
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-2 font-medium">
          <span aria-hidden>{p.category?.icon}</span>
          <span className="truncate">{p.category?.name ?? 'Unknown'}</span>
        </span>
        <span className="shrink-0 font-semibold tabular-nums">
          {formatMoney(p.spent)} <span className="font-normal text-faint">of {formatMoney(p.budget.limit)}</span>
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-sunken"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, Math.round(p.pct * 100))}
        aria-valuetext={valueText(p.spent, p.budget.limit)}
        aria-label={`${p.category?.name ?? 'Unknown'} budget`}
      >
        <div className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${BAR[p.status]}`} style={{ width: `${width}%` }} />
      </div>
      <p className={`mt-1.5 text-xs tabular-nums ${TEXT[p.status]}`}>
        {p.status === 'over'
          ? `Over by ${formatMoney(-p.remaining)}`
          : `${formatMoney(p.remaining)} left, ${Math.round(p.pct * 100)}% used`}
      </p>
    </div>
  );
}

/**
 * Thicker bar for the whole month: all budgeted spending against the sum of all limits.
 * The faint tick at 80% marks where a budget turns amber.
 */
export function BudgetTotalBar({ spent, limit, status, label }: { spent: number; limit: number; status: BudgetStatus; label: string }) {
  const pct = limit > 0 ? spent / limit : 0;
  return (
    <div className="relative">
      <div
        className="h-3 overflow-hidden rounded-full bg-sunken"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, Math.round(pct * 100))}
        aria-valuetext={valueText(spent, limit)}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${BAR[status]}`}
          style={{ width: `${Math.min(100, pct * 100)}%` }}
        />
      </div>
      <span className="pointer-events-none absolute top-[-3px] left-[80%] h-[18px] w-px bg-ink/25" aria-hidden />
    </div>
  );
}
