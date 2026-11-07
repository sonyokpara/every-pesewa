import { endOfMonth, format, parseISO, startOfYear, subMonths } from 'date-fns';
import { useMemo, useState } from 'react';
import { CategoryDonut, MonthlyBars } from '../components/Charts';
import { PageHeader, PanelHeader } from '../components/PageHeader';
import { SummaryCards } from '../components/SummaryCards';
import { currentMonth, formatDate, formatMoney, todayISO } from '../lib/format';
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

  // Spell out the dates the figures cover, so "This year" or a custom range is unambiguous.
  const rangeDescription =
    preset === 'all'
      ? 'Showing everything you’ve recorded.'
      : from && to
        ? `Showing ${formatDate(from)} to ${formatDate(to)}.`
        : from
          ? `Showing from ${formatDate(from)}.`
          : to
            ? `Showing up to ${formatDate(to)}.`
            : 'Showing everything you’ve recorded.';

  return (
    <div className="space-y-6">
      <PageHeader title="Reports">
        {/* Scrolls sideways on narrow phones rather than wrapping into a ragged block. */}
        <div className="-mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:w-auto sm:px-0">
          <div className="flex w-max gap-1 rounded-xl border border-line bg-surface p-1" role="group" aria-label="Period">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                aria-pressed={preset === p.id}
                onClick={() => {
                  if (p.id === 'custom' && preset !== 'custom') setCustom([from, to]);
                  setPreset(p.id);
                }}
                className={`cursor-pointer rounded-[9px] px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                  preset === p.id ? 'bg-brand text-on-brand' : 'text-muted hover:bg-sunken hover:text-ink'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      {preset === 'custom' && (
        <div className="flex flex-wrap gap-3 rounded-2xl border border-line bg-surface p-4">
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

      <div className="space-y-3">
        <p className="text-sm text-muted">{rangeDescription}</p>
        <SummaryCards totals={sum} />
        <dl className="grid grid-cols-1 divide-y divide-line rounded-2xl border border-line bg-surface sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="px-5 py-4">
            <dt className="text-[13px] font-medium text-muted">Savings rate</dt>
            <dd className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
              {savingsRate === null ? '—' : `${Math.round(savingsRate * 100)}%`}
            </dd>
            <dd className="mt-0.5 text-xs text-muted">Share of money in that you kept</dd>
          </div>
          <div className="px-5 py-4">
            <dt className="text-[13px] font-medium text-muted">Average monthly spending</dt>
            <dd className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{formatMoney(Math.round(avgSpend))}</dd>
            <dd className="mt-0.5 text-xs text-muted">Over months with activity in the 12-month trend</dd>
          </div>
        </dl>
      </div>

      <section className="card" aria-labelledby="r-spending">
        <PanelHeader id="r-spending" title="Spending by category" />
        <CategoryDonut data={spending} height={260} />
      </section>

      <section className="card" aria-labelledby="r-trend">
        <PanelHeader id="r-trend" title="Money in and out, last 12 months" />
        <MonthlyBars data={trend} />
      </section>

      {income.length > 0 && (
        <section className="card" aria-labelledby="r-income">
          <PanelHeader id="r-income" title="Where your money came from" />
          <ul className="space-y-4">
            {income.map((c) => (
              <li key={c.categoryId}>
                <div className="mb-1.5 flex justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-medium">
                    <span aria-hidden>{c.icon}</span>
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatMoney(c.total)} <span className="ml-1 font-normal text-faint">{Math.round(c.share * 100)}%</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-sunken">
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
