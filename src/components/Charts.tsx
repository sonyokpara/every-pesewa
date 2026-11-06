import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney, formatMoneyCompact } from '../lib/format';
import type { CategoryTotal, MonthPoint } from '../lib/stats';

const tooltipStyle = {
  contentStyle: {
    borderRadius: 8,
    border: '1px solid rgb(148 163 184 / 0.3)',
    background: 'var(--tooltip-bg, #fff)',
    color: 'inherit',
    fontSize: 13,
  },
  itemStyle: { color: 'inherit' },
};

export function CategoryDonut({ data, height = 240, showLegend = true }: { data: CategoryTotal[]; height?: number; showLegend?: boolean }) {
  if (!data.length) return <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No spending in this period.</p>;
  const total = data.reduce((s, d) => s + d.total, 0);
  return (
    <div className={showLegend ? 'grid items-center gap-4 sm:grid-cols-2' : ''}>
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="total" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={1.5} strokeWidth={0}>
              {data.map((d) => (
                <Cell key={d.categoryId} fill={d.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatMoney(Number(v))} {...tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-slate-500 dark:text-slate-400">Total spent</span>
          <span className="text-lg font-bold tabular-nums">{formatMoneyCompact(total)}</span>
        </div>
      </div>
      {showLegend && (
        <ul className="space-y-1.5">
          {data.map((d) => (
            <li key={d.categoryId} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
              <span className="flex-1 truncate">
                {d.icon} {d.name}
              </span>
              <span className="tabular-nums text-slate-500 dark:text-slate-400">{Math.round(d.share * 100)}%</span>
              <span className="w-28 text-right font-medium tabular-nums">{formatMoney(d.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MonthlyBars({ data, height = 300 }: { data: MonthPoint[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="rgb(148 163 184 / 0.25)" />
          <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v) => formatMoneyCompact(Number(v))}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip formatter={(v) => formatMoney(Number(v))} cursor={{ fill: 'rgb(148 163 184 / 0.12)' }} {...tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="expense" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
