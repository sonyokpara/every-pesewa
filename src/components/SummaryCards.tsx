import { formatMoney } from '../lib/format';
import type { Totals } from '../lib/stats';

/** `label` names the period when nothing else on the page does (Reports); Dashboard's month picker already shows it. */
export function SummaryCards({ totals, label }: { totals: Totals; label?: string }) {
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
    // Three columns only from md: at sm widths a large amount (GH₵1,234,567.89) overflowed its card.
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {items.map((i) => (
        <div key={i.name} className="card min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <span aria-hidden>{i.icon}</span> {i.name} {label && <span className="normal-case tracking-normal">· {label}</span>}
          </p>
          <p className={`mt-1 text-xl font-bold tabular-nums break-words lg:text-2xl ${i.cls}`}>{formatMoney(i.value)}</p>
        </div>
      ))}
    </div>
  );
}
