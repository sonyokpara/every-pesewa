import { describe, expect, it } from 'vitest';
import type { Budget, Category, Transaction } from '../types';
import { budgetProgress, budgetStatus, budgetSummary, byCategory, inMonth, monthlyTrend, totals } from './stats';

const cats: Category[] = [
  { id: 1, name: 'Food', type: 'expense', color: '#f00', icon: '🍲' },
  { id: 2, name: 'Transport', type: 'expense', color: '#0f0', icon: '🚌' },
  { id: 3, name: 'Salary', type: 'income', color: '#00f', icon: '💼' },
];

let n = 0;
const tx = (type: 'income' | 'expense', amount: number, categoryId: number, date: string): Transaction => ({
  id: ++n,
  type,
  amount,
  categoryId,
  date,
  note: '',
  createdAt: n,
});

const txs = [
  tx('income', 500000, 3, '2026-10-01'),
  tx('expense', 12050, 1, '2026-10-03'),
  tx('expense', 7950, 1, '2026-10-15'),
  tx('expense', 5000, 2, '2026-10-20'),
  tx('expense', 3000, 1, '2026-09-28'),
  tx('income', 450000, 3, '2026-09-01'),
];

describe('totals', () => {
  it('sums income, expense and balance in pesewas', () => {
    expect(totals(inMonth(txs, '2026-10'))).toEqual({ income: 500000, expense: 25000, balance: 475000 });
  });
  it('handles empty input', () => {
    expect(totals([])).toEqual({ income: 0, expense: 0, balance: 0 });
  });
});

describe('byCategory', () => {
  it('groups expenses by category, largest first, with shares', () => {
    const res = byCategory(inMonth(txs, '2026-10'), cats);
    expect(res.map((r) => [r.name, r.total])).toEqual([
      ['Food', 20000],
      ['Transport', 5000],
    ]);
    expect(res[0].share).toBeCloseTo(0.8);
  });
});

describe('monthlyTrend', () => {
  it('returns `count` months ending at endMonth', () => {
    const res = monthlyTrend(txs, '2026-10', 3);
    expect(res.map((p) => p.month)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(res[1]).toMatchObject({ income: 450000, expense: 3000, net: 447000 });
    expect(res[0]).toMatchObject({ income: 0, expense: 0 });
  });
  it('crosses year boundaries', () => {
    expect(monthlyTrend([], '2027-01', 2).map((p) => p.month)).toEqual(['2026-12', '2027-01']);
  });
});

describe('budgets', () => {
  it('classifies status at 80% and over 100%', () => {
    expect(budgetStatus(7999, 10000)).toBe('ok');
    expect(budgetStatus(8000, 10000)).toBe('warn');
    expect(budgetStatus(10000, 10000)).toBe('warn');
    expect(budgetStatus(10001, 10000)).toBe('over');
  });

  it('computes spent only within the budget month and category', () => {
    const budgets: Budget[] = [
      { id: 1, categoryId: 1, month: '2026-10', limit: 15000 },
      { id: 2, categoryId: 2, month: '2026-10', limit: 10000 },
    ];
    const res = budgetProgress(budgets, txs, cats);
    const food = res.find((r) => r.budget.categoryId === 1)!;
    expect(food.spent).toBe(20000);
    expect(food.remaining).toBe(-5000);
    expect(food.status).toBe('over');
    const transport = res.find((r) => r.budget.categoryId === 2)!;
    expect(transport).toMatchObject({ spent: 5000, status: 'ok', pct: 0.5 });
    expect(res[0].budget.categoryId).toBe(1); // sorted by pct desc
  });

  it('summarises a month of budgets', () => {
    const extra = [...txs, tx('expense', 4000, 99, '2026-10-21')]; // a category with no budget
    const budgets: Budget[] = [
      { id: 1, categoryId: 1, month: '2026-10', limit: 15000 },
      { id: 2, categoryId: 2, month: '2026-10', limit: 10000 },
    ];
    const month = inMonth(extra, '2026-10');
    const s = budgetSummary(budgetProgress(budgets, month, cats), month);
    expect(s).toEqual({
      limit: 25000,
      spent: 25000,
      remaining: 0,
      pct: 1,
      status: 'warn',
      overCount: 1,
      warnCount: 0,
      unbudgetedSpent: 4000,
    });
  });

  it('summarises an empty month without dividing by zero', () => {
    expect(budgetSummary([], [])).toMatchObject({ limit: 0, spent: 0, pct: 0, status: 'ok', overCount: 0 });
  });
});
