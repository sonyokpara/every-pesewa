import { useMemo } from 'react';
import { BudgetBar } from '../components/BudgetBar';
import { CategoryDonut } from '../components/Charts';
import { MonthPicker } from '../components/MonthPicker';
import { SummaryCards } from '../components/SummaryCards';
import { TransactionList } from '../components/TransactionList';
import { monthLabel } from '../lib/format';
import { useBudgets, useCategories, useCategoryMap, useTransactions } from '../lib/hooks';
import { budgetProgress, byCategory, inMonth, totals } from '../lib/stats';
import type { Transaction } from '../types';
import type { PageId } from '../App';

interface Props {
  month: string;
  setMonth: (m: string) => void;
  onEdit: (t: Transaction) => void;
  navigate: (p: PageId) => void;
}

export function Dashboard({ month, setMonth, onEdit, navigate }: Props) {
  const all = useTransactions() ?? [];
  const categories = useCategories();
  const catMap = useCategoryMap(categories);
  const budgets = useBudgets(month);

  const monthTxs = useMemo(() => inMonth(all, month), [all, month]);
  const sum = useMemo(() => totals(monthTxs), [monthTxs]);
  const spending = useMemo(() => byCategory(monthTxs, categories), [monthTxs, categories]);
  const progress = useMemo(() => budgetProgress(budgets, monthTxs, categories), [budgets, monthTxs, categories]);
  const alerts = progress.filter((p) => p.status !== 'ok');
  const recent = useMemo(
    () => [...monthTxs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 6),
    [monthTxs],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Overview</h1>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      <SummaryCards totals={sum} label={monthLabel(month)} />

      <div className="grid gap-5 lg:grid-cols-5">
        <section className="card lg:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Recent transactions</h2>
            <button className="text-sm text-emerald-700 hover:underline dark:text-emerald-400" onClick={() => navigate('transactions')}>
              View all →
            </button>
          </div>
          <TransactionList
            transactions={recent}
            categoryMap={catMap}
            onEdit={onEdit}
            emptyMessage={`Nothing recorded for ${monthLabel(month)} yet. Tap “+ Add” to log your first transaction.`}
          />
        </section>

        <div className="space-y-5 lg:col-span-2">
          <section className="card">
            <h2 className="mb-2 font-semibold">Spending by category</h2>
            <CategoryDonut data={spending} height={200} showLegend={false} />
            {spending.length > 0 && (
              <ul className="mt-3 space-y-1">
                {spending.slice(0, 4).map((s) => (
                  <li key={s.categoryId} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="flex-1 truncate">{s.name}</span>
                    <span className="tabular-nums text-slate-500">{Math.round(s.share * 100)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Budget alerts</h2>
              <button className="text-sm text-emerald-700 hover:underline dark:text-emerald-400" onClick={() => navigate('budgets')}>
                Budgets →
              </button>
            </div>
            {!budgets.length ? (
              <p className="text-sm text-slate-500">No budgets set for this month.</p>
            ) : alerts.length ? (
              <div className="space-y-4">
                {alerts.map((p) => (
                  <BudgetBar key={p.budget.id} p={p} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                ✅ All {budgets.length} budget{budgets.length === 1 ? ' is' : 's are'} on track.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
