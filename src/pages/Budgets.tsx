import { useEffect, useMemo, useState } from 'react';
import { BudgetBar, BudgetTotalBar } from '../components/BudgetBar';
import { MonthPicker } from '../components/MonthPicker';
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Budgets</h1>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      {budgets.length > 0 && (
        <section className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Total budgeted for {monthLabel(month)}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <span className="text-2xl font-bold tabular-nums">{formatMoney(summary.spent)}</span>
            <span className="text-slate-500 dark:text-slate-400">spent of {formatMoney(summary.limit)}</span>
          </div>
          <div className="mt-3">
            <BudgetTotalBar spent={summary.spent} limit={summary.limit} status={summary.status} label="Total budget used" />
          </div>
        </section>
      )}

      <section className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Monthly limits by category</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Leave a limit empty for no budget. Bars turn amber at 80% and red when you go over.</p>
          </div>
          {prevBudgets.length > 0 && (
            <button className="btn-secondary" onClick={copyPrev}>
              ⧉ Copy from {monthLabel(shiftMonth(month, -1))}
            </button>
          )}
        </div>
        {message && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{message}</p>}
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {expenseCats.map((c) => {
            const p = progress.find((x) => x.budget.categoryId === c.id);
            return (
              <li key={c.id} className="grid items-center gap-3 py-3 sm:grid-cols-[1fr_10rem]">
                {p ? (
                  <BudgetBar p={p} />
                ) : (
                  <div className="text-sm">
                    <span className="font-medium">
                      {c.icon} {c.name}
                    </span>
                    <span className="ml-2 text-slate-500 dark:text-slate-400">{formatMoney(spentBy.get(c.id!) ?? 0)} spent · no budget</span>
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

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate-400">GH₵</span>
      <input
        className={`input pl-12 text-right tabular-nums ${error ? 'border-rose-500' : ''}`}
        inputMode="decimal"
        placeholder="No limit"
        aria-label={`Monthly budget for ${category.name}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </div>
  );
}
