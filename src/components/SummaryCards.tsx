import { formatMoney } from '../lib/format';
import type { Totals } from '../lib/stats';

export function SummaryCards({ totals, label }: { totals: Totals; label: string }) {
  const items = [
    { name: 'Income', value: totals.income, cls: 'text-emerald-600 dark:text-emerald-400', icon: '↓' },
    { name: 'Expenses', value: totals.expense, cls: 'text-rose-600 dark:text-rose-400', icon: '↑' },
    {
      name: 'Balance',
      value: totals.balance,
      cls: totals.balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white',
      icon: '=',
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((i) => (
        <div key={i.name} className="card">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <span aria-hidden>{i.icon}</span> {i.name} <span className="normal-case tracking-normal">· {label}</span>
          </p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${i.cls}`}>{formatMoney(i.value)}</p>
        </div>
      ))}
    </div>
  );
}
