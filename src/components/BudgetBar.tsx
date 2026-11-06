import { formatMoney } from '../lib/format';
import type { BudgetProgress, BudgetStatus } from '../lib/stats';

const BAR = { ok: 'bg-emerald-500', warn: 'bg-amber-500', over: 'bg-rose-500' } as const;
const TEXT = {
  ok: 'text-slate-500',
  warn: 'text-amber-600 dark:text-amber-400',
  over: 'text-rose-600 dark:text-rose-400 font-medium',
} as const;

export function BudgetBar({ p }: { p: BudgetProgress }) {
  const width = Math.min(100, p.pct * 100);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate font-medium">
          {p.category?.icon} {p.category?.name ?? 'Unknown'}
        </span>
        <span className="shrink-0 tabular-nums text-slate-600 dark:text-slate-300">
          {formatMoney(p.spent)} <span className="text-slate-400">/ {formatMoney(p.budget.limit)}</span>
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(p.pct * 100)}
        aria-label={`${p.category?.name} budget used`}
      >
        <div className={`h-full rounded-full transition-all ${BAR[p.status]}`} style={{ width: `${width}%` }} />
      </div>
      <p className={`mt-1 text-xs ${TEXT[p.status]}`}>
        {p.status === 'over'
          ? `Over budget by ${formatMoney(-p.remaining)}`
          : `${formatMoney(p.remaining)} left · ${Math.round(p.pct * 100)}% used`}
      </p>
    </div>
  );
}

/** Thicker bar for the whole month: all budgeted spending against the sum of all limits. */
export function BudgetTotalBar({ spent, limit, status, label }: { spent: number; limit: number; status: BudgetStatus; label: string }) {
  const pct = limit > 0 ? spent / limit : 0;
  return (
    <div
      className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
      aria-label={label}
    >
      <div className={`h-full rounded-full transition-all ${BAR[status]}`} style={{ width: `${Math.min(100, pct * 100)}%` }} />
    </div>
  );
}
