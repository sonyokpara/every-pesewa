import { useMemo, useState } from 'react';
import { BalanceNote } from '../components/BalanceNote';
import { BudgetBar, BudgetTotalBar } from '../components/BudgetBar';
import { CategoryDonut } from '../components/Charts';
import { IconCopy } from '../components/Icons';
import { MonthPicker } from '../components/MonthPicker';
import { PageHeader, PanelHeader } from '../components/PageHeader';
import { DashboardSkeleton } from '../components/Skeleton';
import { TransactionList } from '../components/TransactionList';
import { copyBudgets } from '../db/db';
import { formatMoney, monthLabel, shiftMonth } from '../lib/format';
import { useBudgets, useBudgetsQuery, useCategories, useCategoryMap, useTransactions } from '../lib/hooks';
import { budgetProgress, budgetSummary, byCategory, inMonth, totals } from '../lib/stats';
import type { Budget, Transaction } from '../types';

interface Props {
  month: string;
  setMonth: (m: string) => void;
  onEdit: (t: Transaction) => void;
  onAdd: () => void;
}

/** How many budgets the dashboard lists before "Show all" (most-used first, so the urgent ones stay visible). */
const BUDGETS_SHOWN = 6;
/** How many categories the spending legend lists before "+N more". */
const LEGEND_SHOWN = 4;

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
  onAdd,
  all,
  budgets,
}: Props & { all: Transaction[]; budgets: Budget[] }) {
  const categories = useCategories();
  const catMap = useCategoryMap(categories);
  const [showAllBudgets, setShowAllBudgets] = useState(false);
  // Budgets are per month, so a new month starts empty: offer to carry last month's over.
  const prevMonth = shiftMonth(month, -1);
  const prevBudgets = useBudgets(prevMonth);

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
    <div className="space-y-6">
      <PageHeader title="Overview">
        <MonthPicker month={month} onChange={setMonth} />
      </PageHeader>

      <BalanceNote totals={sum} month={month} onAdd={onAdd} />

      <section className="card" aria-labelledby="budgets-heading">
        <PanelHeader id="budgets-heading" title="Monthly budgets">
          <a href="#budgets" className="link py-1 text-sm">
            {progress.length ? 'Edit budgets' : 'Set budgets'}
          </a>
        </PanelHeader>
        {!progress.length ? (
          <div className="rounded-xl bg-sunken px-4 py-5">
            <p className="max-w-prose text-sm text-muted">
              No spending limits for {monthLabel(month)}. Give a category a monthly limit and you’ll see how close you are to it here.
            </p>
            {prevBudgets.length > 0 && (
              <button className="btn-primary mt-4" onClick={() => copyBudgets(prevMonth, month)}>
                <IconCopy size={17} />
                Copy {monthLabel(prevMonth)}’s {prevBudgets.length} budget{prevBudgets.length === 1 ? '' : 's'}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-sm text-muted">
                <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">{formatMoney(budget.spent)}</span>{' '}
                <span className="whitespace-nowrap">spent of {formatMoney(budget.limit)}</span>
              </p>
              <p className={`text-sm tabular-nums ${budget.remaining < 0 ? 'font-semibold text-loss' : 'text-muted'}`}>
                {budget.remaining < 0 ? `${formatMoney(-budget.remaining)} over` : `${formatMoney(budget.remaining)} left`}
              </p>
            </div>
            <BudgetTotalBar spent={budget.spent} limit={budget.limit} status={budget.status} label="Total budget used" />
            {(budget.overCount > 0 || budget.warnCount > 0) && (
              <p className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                {budget.overCount > 0 && (
                  <span className="rounded-full bg-loss-soft px-2.5 py-1 text-loss">{budget.overCount} over budget</span>
                )}
                {budget.warnCount > 0 && (
                  <span className="rounded-full bg-warn-soft px-2.5 py-1 text-warn">{budget.warnCount} near the limit</span>
                )}
              </p>
            )}
            <div id="dashboard-budget-list" className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
              {(showAllBudgets ? progress : progress.slice(0, BUDGETS_SHOWN)).map((p) => (
                <BudgetBar key={p.budget.id} p={p} />
              ))}
            </div>
            {progress.length > BUDGETS_SHOWN && (
              <button
                className="link mt-4 py-1 text-sm"
                aria-expanded={showAllBudgets}
                aria-controls="dashboard-budget-list"
                onClick={() => setShowAllBudgets((v) => !v)}
              >
                {showAllBudgets ? 'Show fewer' : `Show all ${progress.length} budgets`}
              </button>
            )}
            {budget.unbudgetedSpent > 0 && (
              <p className="mt-5 border-t border-line pt-4 text-[13px] text-muted">
                Plus {formatMoney(budget.unbudgetedSpent)} spent in categories without a budget.
              </p>
            )}
          </>
        )}
      </section>

      {/* grid-cols-1 + min-w-0 let the cards shrink on phones; otherwise long amounts widen them past the screen. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* With no spending there is no chart, so the transactions card takes the full width. */}
        <section className={`card min-w-0 ${spending.length ? 'lg:col-span-3' : 'lg:col-span-5'}`} aria-labelledby="recent-heading">
          <PanelHeader id="recent-heading" title="Recent transactions">
            <a href="#transactions" className="link py-1 text-sm">
              View all
            </a>
          </PanelHeader>
          <TransactionList
            transactions={recent}
            categoryMap={catMap}
            onEdit={onEdit}
            emptyMessage={`Nothing recorded for ${monthLabel(month)} yet.`}
          />
        </section>

        {spending.length > 0 && (
          <section className="card min-w-0 lg:col-span-2" aria-labelledby="spending-heading">
            <PanelHeader id="spending-heading" title="Where it went" />
            <CategoryDonut data={spending} height={200} showLegend={false} />
            <ul className="mt-4 space-y-2">
              {spending.slice(0, LEGEND_SHOWN).map((s) => (
                <li key={s.categoryId} className="flex items-center gap-2.5 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} />
                  <span className="flex-1 truncate">{s.name}</span>
                  <span className="text-muted tabular-nums">{Math.round(s.share * 100)}%</span>
                  <span className="text-right font-semibold tabular-nums">{formatMoney(s.total)}</span>
                </li>
              ))}
            </ul>
            {spending.length > LEGEND_SHOWN && (
              <p className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm text-muted">
                +{spending.length - LEGEND_SHOWN} more {spending.length - LEGEND_SHOWN === 1 ? 'category' : 'categories'}
                <a href="#reports" className="link py-1">
                  See report
                </a>
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
