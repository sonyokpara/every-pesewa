import { endOfMonth, format, parseISO, startOfYear, subMonths } from 'date-fns';
import { useMemo, useState } from 'react';
import { CategoryDonut, MonthlyBars } from '../components/Charts';
import { SummaryCards } from '../components/SummaryCards';
import { currentMonth, formatMoney, todayISO } from '../lib/format';
import { useCategories, useTransactions } from '../lib/hooks';
import { byCategory, inRange, monthlyTrend, totals } from '../lib/stats';

type Preset = 'this-month' | 'last-3' | 'last-6' | 'this-year' | 'all' | 'custom';

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'this-month', label: 'This month' },
  { id: 'last-3', label: 'Last 3 months' },
  { id: 'last-6', label: 'Last 6 months' },
  { id: 'this-year', label: 'This year' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom' },
];

function presetRange(p: Preset): [string, string] {
  const now = new Date();
  const f = (d: Date) => format(d, 'yyyy-MM-dd');
  const monthStart = (n: number) => f(subMonths(parseISO(`${currentMonth()}-01`), n));
  switch (p) {
    case 'this-month':
      return [monthStart(0), f(endOfMonth(now))];
    case 'last-3':
      return [monthStart(2), f(endOfMonth(now))];
    case 'last-6':
      return [monthStart(5), f(endOfMonth(now))];
    case 'this-year':
      return [f(startOfYear(now)), f(endOfMonth(now))];
    default:
      return ['', ''];
  }
}

export function Reports() {
  const all = useTransactions() ?? [];
  const categories = useCategories();
  const [preset, setPreset] = useState<Preset>('this-month');
  const [custom, setCustom] = useState<[string, string]>(() => presetRange('this-month'));

  const [from, to] = preset === 'custom' ? custom : presetRange(preset);
  const ranged = useMemo(() => inRange(all, from || undefined, to || undefined), [all, from, to]);
  const sum = useMemo(() => totals(ranged), [ranged]);
  const spending = useMemo(() => byCategory(ranged, categories, 'expense'), [ranged, categories]);
  const income = useMemo(() => byCategory(ranged, categories, 'income'), [ranged, categories]);

  // Trend: 12 months ending at the range end (or the current month).
  const trendEnd = (to || todayISO()).slice(0, 7);
  const trend = useMemo(() => monthlyTrend(all, trendEnd, 12), [all, trendEnd]);
  const activeMonths = trend.filter((p) => p.income || p.expense);
  const avgSpend = activeMonths.length ? activeMonths.reduce((s, p) => s + p.expense, 0) / activeMonths.length : 0;
  const savingsRate = sum.income > 0 ? sum.balance / sum.income : null;

  const rangeLabel = preset === 'all' ? 'All time' : PRESETS.find((p) => p.id === preset)!.label;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                if (p.id === 'custom' && preset !== 'custom') setCustom([from, to]);
                setPreset(p.id);
              }}
              className={`btn px-2.5 py-1.5 text-xs ${
                preset === p.id ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {preset === 'custom' && (
        <div className="card flex flex-wrap gap-3">
          <div>
            <label className="label" htmlFor="r-from">
              From
            </label>
            <input id="r-from" type="date" className="input" value={custom[0]} onChange={(e) => setCustom([e.target.value, custom[1]])} />
          </div>
          <div>
            <label className="label" htmlFor="r-to">
              To
            </label>
            <input id="r-to" type="date" className="input" value={custom[1]} onChange={(e) => setCustom([custom[0], e.target.value])} />
          </div>
        </div>
      )}

      <SummaryCards totals={sum} label={rangeLabel} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Savings rate · {rangeLabel}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{savingsRate === null ? '—' : `${Math.round(savingsRate * 100)}%`}</p>
          <p className="text-xs text-slate-500">Share of income left after expenses</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Average monthly spending</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatMoney(Math.round(avgSpend))}</p>
          <p className="text-xs text-slate-500">Across active months in the 12-month trend below</p>
        </div>
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold">Spending by category</h2>
        <CategoryDonut data={spending} height={260} />
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">Income vs expenses · last 12 months</h2>
        <MonthlyBars data={trend} />
      </section>

      {income.length > 0 && (
        <section className="card">
          <h2 className="mb-3 font-semibold">Income sources</h2>
          <ul className="space-y-2">
            {income.map((c) => (
              <li key={c.categoryId}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>
                    {c.icon} {c.name}
                  </span>
                  <span className="tabular-nums">
                    {formatMoney(c.total)} <span className="text-slate-500">· {Math.round(c.share * 100)}%</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full" style={{ width: `${c.share * 100}%`, background: c.color }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
