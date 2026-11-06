import type { Budget, Category, Transaction, TxType } from '../types';
import { shiftMonth, shortMonthLabel } from './format';

export interface Totals {
  income: number;
  expense: number;
  balance: number;
}

export function totals(txs: Transaction[]): Totals {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
}

export const inMonth = (txs: Transaction[], month: string) => txs.filter((t) => t.date.startsWith(month));

export const inRange = (txs: Transaction[], from?: string, to?: string) =>
  txs.filter((t) => (!from || t.date >= from) && (!to || t.date <= to));

export interface CategoryTotal {
  categoryId: number;
  name: string;
  color: string;
  icon: string;
  total: number;
  share: number;
}

/** Sum transactions of one type per category, largest first. */
export function byCategory(txs: Transaction[], categories: Category[], type: TxType = 'expense'): CategoryTotal[] {
  const catMap = new Map(categories.map((c) => [c.id!, c]));
  const sums = new Map<number, number>();
  let grand = 0;
  for (const t of txs) {
    if (t.type !== type) continue;
    sums.set(t.categoryId, (sums.get(t.categoryId) ?? 0) + t.amount);
    grand += t.amount;
  }
  return [...sums.entries()]
    .map(([categoryId, total]) => {
      const c = catMap.get(categoryId);
      return {
        categoryId,
        name: c?.name ?? 'Unknown',
        color: c?.color ?? '#94a3b8',
        icon: c?.icon ?? '❔',
        total,
        share: grand ? total / grand : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export interface MonthPoint {
  month: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

/** Income/expense per month for the `count` months ending at `endMonth` (inclusive). */
export function monthlyTrend(txs: Transaction[], endMonth: string, count = 12): MonthPoint[] {
  const months = Array.from({ length: count }, (_, i) => shiftMonth(endMonth, i - count + 1));
  const idx = new Map(months.map((m, i) => [m, i]));
  const points: MonthPoint[] = months.map((m) => ({ month: m, label: shortMonthLabel(m), income: 0, expense: 0, net: 0 }));
  for (const t of txs) {
    const i = idx.get(t.date.slice(0, 7));
    if (i === undefined) continue;
    points[i][t.type] += t.amount;
  }
  for (const p of points) p.net = p.income - p.expense;
  return points;
}

export type BudgetStatus = 'ok' | 'warn' | 'over';

export interface BudgetProgress {
  budget: Budget;
  category: Category | undefined;
  spent: number;
  remaining: number;
  pct: number;
  status: BudgetStatus;
}

export const WARN_THRESHOLD = 0.8;

export function budgetStatus(spent: number, limit: number): BudgetStatus {
  if (limit <= 0) return 'ok';
  if (spent > limit) return 'over';
  if (spent >= limit * WARN_THRESHOLD) return 'warn';
  return 'ok';
}

/** Progress of each budget, using expense transactions from the budget's month. */
export function budgetProgress(budgets: Budget[], txs: Transaction[], categories: Category[]): BudgetProgress[] {
  const catMap = new Map(categories.map((c) => [c.id!, c]));
  const spentBy = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== 'expense') continue;
    const key = `${t.categoryId}|${t.date.slice(0, 7)}`;
    spentBy.set(key, (spentBy.get(key) ?? 0) + t.amount);
  }
  return budgets
    .map((budget) => {
      const spent = spentBy.get(`${budget.categoryId}|${budget.month}`) ?? 0;
      return {
        budget,
        category: catMap.get(budget.categoryId),
        spent,
        remaining: budget.limit - spent,
        pct: budget.limit > 0 ? spent / budget.limit : 0,
        status: budgetStatus(spent, budget.limit),
      };
    })
    .sort((a, b) => b.pct - a.pct);
}

export interface BudgetSummary {
  /** Sum of all budget limits, in pesewas. */
  limit: number;
  /** Spending in budgeted categories, in pesewas. */
  spent: number;
  remaining: number;
  pct: number;
  status: BudgetStatus;
  overCount: number;
  warnCount: number;
  /** Expense spending in categories that have no budget this month. */
  unbudgetedSpent: number;
}

/**
 * Roll budget progress up into one month-level figure. `monthTxs` must be the
 * transactions of the same month the budgets belong to.
 */
export function budgetSummary(progress: BudgetProgress[], monthTxs: Transaction[]): BudgetSummary {
  const limit = progress.reduce((s, p) => s + p.budget.limit, 0);
  const spent = progress.reduce((s, p) => s + p.spent, 0);
  const budgeted = new Set(progress.map((p) => p.budget.categoryId));
  let unbudgetedSpent = 0;
  for (const t of monthTxs) {
    if (t.type === 'expense' && !budgeted.has(t.categoryId)) unbudgetedSpent += t.amount;
  }
  return {
    limit,
    spent,
    remaining: limit - spent,
    pct: limit > 0 ? spent / limit : 0,
    status: budgetStatus(spent, limit),
    overCount: progress.filter((p) => p.status === 'over').length,
    warnCount: progress.filter((p) => p.status === 'warn').length,
    unbudgetedSpent,
  };
}
