import { useEffect, useMemo, useState } from 'react';
import { BudgetBar, BudgetTotalBar } from '../components/BudgetBar';
import { IconCopy } from '../components/Icons';
import { MonthPicker } from '../components/MonthPicker';
import { PageHeader } from '../components/PageHeader';
import { copyBudgets, setBudget } from '../db/db';
import { formatMoney, monthLabel, parseAmount, shiftMonth, toDecimal } from '../lib/format';
import { useBudgets, useCategories, useTransactions } from '../lib/hooks';
import { budgetProgress, budgetSummary, byCategory, inMonth } from '../lib/stats';
import type { Category } from '../types';

export function Budgets({ month, setMonth }: { month: string; setMonth: (m: string) => void }) {
  const all = useTransactions() ?? [];
  const categories = useCategories();
  const budgets = useBudgets(month);
  const prevBudgets = useBudgets(shiftMonth(month, -1));
  const [message, setMessage] = useState('');

  const monthTxs = useMemo(() => inMonth(all, month), [all, month]);
  const progress = useMemo(() => budgetProgress(budgets, monthTxs, categories), [budgets, monthTxs, categories]);
  const spentBy = useMemo(() => new Map(byCategory(monthTxs, categories).map((c) => [c.categoryId, c.total])), [monthTxs, categories]);
  const expenseCats = categories.filter((c) => c.type === 'expense').sort((a, b) => a.name.localeCompare(b.name));

  const summary = useMemo(() => budgetSummary(progress, monthTxs), [progress, monthTxs]);

  useEffect(() => setMessage(''), [month]);

  async function copyPrev() {
    const n = await copyBudgets(shiftMonth(month, -1), month);
    setMessage(n ? `Copied ${n} budget${n === 1 ? '' : 's'} from ${monthLabel(shiftMonth(month, -1))}.` : 'Nothing new to copy.');
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Budgets">
        <MonthPicker month={month} onChange={setMonth} />
      </PageHeader>

      {budgets.length > 0 && (
        <section className="card" aria-labelledby="budget-total-heading">
          <h2 id="budget-total-heading" className="text-[13px] font-medium text-muted">
            All budgets for {monthLabel(month)}
          </h2>
          <div className="mt-1 mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-muted">
              <span className="text-3xl font-bold tracking-tight text-ink tabular-nums">{formatMoney(summary.spent)}</span> spent of{' '}
              {formatMoney(summary.limit)}
            </p>
            <p className={`text-sm tabular-nums ${summary.remaining < 0 ? 'font-semibold text-loss' : 'text-muted'}`}>
              {summary.remaining < 0 ? `${formatMoney(-summary.remaining)} over` : `${formatMoney(summary.remaining)} left`}
            </p>
          </div>
          <BudgetTotalBar spent={summary.spent} limit={summary.limit} status={summary.status} label="Total budget used" />
        </section>
      )}

      <section className="card" aria-labelledby="limits-heading">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="limits-heading" className="text-[17px] font-semibold tracking-tight">
              Monthly limits by category
            </h2>
            <p className="mt-1 max-w-prose text-sm text-muted">
              Leave a limit empty for no budget. A bar turns amber at 80% and red once you go over.
            </p>
          </div>
          {prevBudgets.length > 0 && (
            <button className="btn-secondary" onClick={copyPrev}>
              <IconCopy size={17} />
              Copy from {monthLabel(shiftMonth(month, -1))}
            </button>
          )}
        </div>
        {message && (
          <p role="status" className="mt-3 rounded-[10px] bg-brand-soft px-3 py-2 text-sm font-medium text-brand-text">
            {message}
          </p>
        )}
        <ul className="mt-2 divide-y divide-line">
          {expenseCats.map((c) => {
            const p = progress.find((x) => x.budget.categoryId === c.id);
            return (
              <li key={c.id} className="grid items-center gap-x-8 gap-y-3 py-4 sm:grid-cols-[1fr_11rem]">
                {p ? (
                  <BudgetBar p={p} />
                ) : (
                  <div className="flex min-w-0 items-baseline justify-between gap-3 text-sm sm:justify-start">
                    <span className="flex min-w-0 items-center gap-2 font-medium">
                      <span aria-hidden>{c.icon}</span>
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="shrink-0 text-faint tabular-nums">{formatMoney(spentBy.get(c.id!) ?? 0)} spent, no limit</span>
                  </div>
                )}
                <LimitInput key={`${c.id}-${month}`} category={c} month={month} limit={p?.budget.limit} />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function LimitInput({ category, month, limit }: { category: Category; month: string; limit?: number }) {
  const [value, setValue] = useState(limit ? toDecimal(limit) : '');
  const [error, setError] = useState(false);

  useEffect(() => setValue(limit ? toDecimal(limit) : ''), [limit]);

  async function commit() {
    if (!value.trim()) {
      setError(false);
      if (limit) await setBudget(category.id!, month, 0);
      return;
    }
    const p = parseAmount(value);
    if (p === null || p < 0) return setError(true);
    setError(false);
    if (p !== limit) await setBudget(category.id!, month, p);
  }

  const errorId = `limit-error-${category.id}`;
  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-faint">GH₵</span>
        <input
          aria-describedby={error ? errorId : undefined}
          className={`input pl-12 text-right font-semibold tabular-nums placeholder:font-normal ${error ? 'border-loss' : ''}`}
          aria-invalid={error}
          inputMode="decimal"
          placeholder="No limit"
          aria-label={`Monthly budget for ${category.name}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-right text-xs font-medium text-loss">
          Enter a number, like 250
        </p>
      )}
    </div>
  );
}
