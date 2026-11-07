import { formatMoney } from '../lib/format';
import type { Totals } from '../lib/stats';

/**
 * Money in, money out and what's left, as one strip divided into columns (one panel, not three
 * look-alike cards, because the three figures are one sum: in − out = balance).
 */
export function SummaryCards({ totals }: { totals: Totals }) {
  const items = [
    { name: 'Money in', value: totals.income, cls: 'text-gain' },
    { name: 'Money out', value: totals.expense, cls: '' },
    { name: 'Balance', value: totals.balance, cls: totals.balance < 0 ? 'text-loss' : '' },
  ];
  return (
    // Three columns only from md: at sm widths a large amount (GH₵1,234,567.89) overflowed its column.
    <dl className="grid grid-cols-1 divide-y divide-line rounded-2xl border border-line bg-surface md:grid-cols-3 md:divide-x md:divide-y-0">
      {items.map((i) => (
        <div key={i.name} className="min-w-0 px-5 py-4">
          <dt className="text-[13px] font-medium text-muted">{i.name}</dt>
          <dd className={`mt-1 text-2xl font-bold tracking-tight break-words tabular-nums ${i.cls}`}>{formatMoney(i.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
