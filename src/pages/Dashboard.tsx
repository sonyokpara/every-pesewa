import { useMemo, useState } from 'react';
import { BudgetBar, BudgetTotalBar } from '../components/BudgetBar';
import { CategoryDonut } from '../components/Charts';
import { MonthPicker } from '../components/MonthPicker';
import { DashboardSkeleton } from '../components/Skeleton';
import { SummaryCards } from '../components/SummaryCards';
import { TransactionList } from '../components/TransactionList';
import { formatMoney, monthLabel } from '../lib/format';
import { useBudgetsQuery, useCategories, useCategoryMap, useTransactions } from '../lib/hooks';
import { budgetProgress, budgetSummary, byCategory, inMonth, totals } from '../lib/stats';
import type { Budget, Transaction } from '../types';
import type { PageId } from '../App';

interface Props {
  month: string;
  setMonth: (m: string) => void;
  onEdit: (t: Transaction) => void;
  navigate: (p: PageId) => void;
}

/** How many budgets the dashboard lists before "Show all" (most-used first, so the urgent ones stay visible). */
const BUDGETS_SHOWN = 6;

export function Dashboard(props: Props) {
  const all = useTransactions();
  const budgets = useBudgetsQuery(props.month);
  // Until IndexedDB answers, show placeholders rather than GH₵0.00 and "nothing recorded" messages.
  if (!all || !budgets) return <DashboardSkeleton />;
  return <DashboardContent {...props} all={all} budgets={budgets} />;
}

function DashboardContent({
  month,
  setMonth,
  onEdit,
  navigate,
  all,
  budgets,
}: Props & { all: Transaction[]; budgets: Budget[] }) {
  const categories = useCategories();
  const catMap = useCategoryMap(categories);
  const [showAllBudgets, setShowAllBudgets] = useState(false);

  const monthTxs = useMemo(() => inMonth(all, month), [all, month]);
  const sum = useMemo(() => totals(monthTxs), [monthTxs]);
  const spending = useMemo(() => byCategory(monthTxs, categories), [monthTxs, categories]);
  const progress = useMemo(() => budgetProgress(budgets, monthTxs, categories), [budgets, monthTxs, categories]);
  const budget = useMemo(() => budgetSummary(progress, monthTxs), [progress, monthTxs]);
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

      <section className="card" aria-labelledby="budgets-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="budgets-heading" className="font-semibold">
            Monthly budgets <span className="font-normal text-slate-500 dark:text-slate-400">· {monthLabel(month)}</span>
          </h2>
          <button className="text-sm text-emerald-700 hover:underline dark:text-emerald-400" onClick={() => navigate('budgets')}>
            {progress.length ? 'Edit budgets →' : 'Set budgets →'}
          </button>
        </div>
        {!progress.length ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No spending limits set for {monthLabel(month)}. Set a monthly limit per category to track your spending against it here.
          </p>
        ) : (
          <>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span>
                <span className="text-lg font-bold tabular-nums">{formatMoney(budget.spent)}</span>
                <span className="text-slate-500 dark:text-slate-400"> spent of {formatMoney(budget.limit)}</span>
              </span>
              <span className={budget.remaining < 0 ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}>
                {budget.remaining < 0 ? `${formatMoney(-budget.remaining)} over` : `${formatMoney(budget.remaining)} left`}
              </span>
            </div>
            <BudgetTotalBar spent={budget.spent} limit={budget.limit} status={budget.status} label="Total budget used" />
            {(budget.overCount > 0 || budget.warnCount > 0) && (
              <p className="mt-1.5 text-xs">
                {budget.overCount > 0 && (
                  <span className="font-medium text-rose-600 dark:text-rose-400">{budget.overCount} over budget</span>
                )}
                {budget.overCount > 0 && budget.warnCount > 0 && <span className="text-slate-400"> · </span>}
                {budget.warnCount > 0 && (
                  <span className="text-amber-700 dark:text-amber-400">{budget.warnCount} near the limit</span>
                )}
              </p>
            )}
            <div id="dashboard-budget-list" className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {(showAllBudgets ? progress : progress.slice(0, BUDGETS_SHOWN)).map((p) => (
                <BudgetBar key={p.budget.id} p={p} />
              ))}
            </div>
            {progress.length > BUDGETS_SHOWN && (
              <button
                className="mt-3 py-1 text-sm text-emerald-700 hover:underline dark:text-emerald-400"
                aria-expanded={showAllBudgets}
                aria-controls="dashboard-budget-list"
                onClick={() => setShowAllBudgets((v) => !v)}
              >
                {showAllBudgets ? 'Show fewer' : `Show all ${progress.length} budgets`}
              </button>
            )}
            {budget.unbudgetedSpent > 0 && (
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:text-slate-400 dark:border-slate-800">
                Plus {formatMoney(budget.unbudgetedSpent)} spent in categories without a budget.
              </p>
            )}
          </>
        )}
      </section>

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
                    <span className="tabular-nums text-slate-500 dark:text-slate-400">{Math.round(s.share * 100)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
