import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney, formatMoneyCompact } from '../lib/format';
import { usePrefersReducedMotion } from '../lib/hooks';
import type { CategoryTotal, MonthPoint } from '../lib/stats';

// Recharts writes these as SVG attributes; modern browsers resolve var() there, so the charts
// follow the light/dark tokens in index.css.
const tooltipStyle = {
  contentStyle: {
    borderRadius: 10,
    border: '1px solid var(--line)',
    background: 'var(--tooltip-bg, #fff)',
    color: 'var(--ink)',
    fontSize: 13,
    boxShadow: '0 8px 24px -12px rgb(6 18 13 / 0.35)',
  },
  itemStyle: { color: 'inherit' },
  labelStyle: { fontWeight: 600, marginBottom: 2 },
};
const tick = { fill: 'var(--faint)', fontSize: 12 };

export function CategoryDonut({ data, height = 240, showLegend = true }: { data: CategoryTotal[]; height?: number; showLegend?: boolean }) {
  const reducedMotion = usePrefersReducedMotion();
  if (!data.length) return <p className="rounded-xl bg-sunken py-10 text-center text-sm text-muted">No spending in this period.</p>;
  const total = data.reduce((s, d) => s + d.total, 0);
  const totalText = formatMoney(total);
  // The SVG is unreadable to screen readers and its amounts only appear on hover, so give the
  // chart a text summary of every slice.
  const summary = `Spending by category, ${totalText} in total: ${data
    .map((d) => `${d.name} ${formatMoney(d.total)} (${Math.round(d.share * 100)}%)`)
    .join(', ')}.`;
  return (
    <div className={showLegend ? 'grid items-center gap-6 sm:grid-cols-2' : ''}>
      <div className="relative" style={{ height }} role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="name"
              innerRadius="68%"
              outerRadius="94%"
              paddingAngle={1.5}
              cornerRadius={3}
              stroke="var(--surface)"
              strokeWidth={2}
              isAnimationActive={!reducedMotion}
            >
              {data.map((d) => (
                <Cell key={d.categoryId} fill={d.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatMoney(Number(v))} {...tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
          <span className="text-xs text-muted">Total spent</span>
          {/* Full amount, matching the money-out figure; shrink long figures to fit inside the ring. */}
          <span
            className={`font-bold tracking-tight tabular-nums ${totalText.length > 13 ? 'text-sm' : totalText.length > 10 ? 'text-base' : 'text-xl'}`}
          >
            {totalText}
          </span>
        </div>
      </div>
      {showLegend && (
        <ul className="space-y-2.5">
          {data.map((d) => (
            <li key={d.categoryId} className="text-sm">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: d.color }} />
                <span className="flex-1 truncate">
                  {d.icon} {d.name}
                </span>
                <span className="text-muted tabular-nums">{Math.round(d.share * 100)}%</span>
                <span className="w-28 text-right font-semibold tabular-nums">{formatMoney(d.total)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MonthlyBars({ data, height = 300 }: { data: MonthPoint[]; height?: number }) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={3} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => formatMoneyCompact(Number(v))} tick={tick} axisLine={false} tickLine={false} width={72} />
          <Tooltip formatter={(v) => formatMoney(Number(v))} cursor={{ fill: 'var(--sunken)' }} {...tooltipStyle} />
          <Legend
            align="left"
            verticalAlign="top"
            iconType="square"
            iconSize={10}
            height={32}
            wrapperStyle={{ fontSize: 13, color: 'var(--muted)' }}
          />
          <Bar dataKey="income" name="Money in" fill="var(--brand)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={!reducedMotion} />
          <Bar dataKey="expense" name="Money out" fill="var(--loss)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={!reducedMotion} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
