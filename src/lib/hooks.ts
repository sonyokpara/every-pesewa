import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { db } from '../db/db';
import type { Budget, Category, Transaction } from '../types';

const EMPTY: never[] = [];

export function useCategories(): Category[] {
  return useLiveQuery(() => db.categories.toArray(), []) ?? EMPTY;
}

export function useTransactions(): Transaction[] | undefined {
  return useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), []);
}

/** A month's budgets, or `undefined` while they load (so a page can tell "loading" from "none set"). */
export function useBudgetsQuery(month: string): Budget[] | undefined {
  return useLiveQuery(() => db.budgets.where('month').equals(month).toArray(), [month]);
}

export function useBudgets(month: string): Budget[] {
  return useBudgetsQuery(month) ?? EMPTY;
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** True when the user asked the OS for less motion; updates if they change the setting. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia(REDUCED_MOTION).matches);
  useEffect(() => {
    const mq = window.matchMedia(REDUCED_MOTION);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export function useCategoryMap(categories: Category[]) {
  return useMemo(() => new Map(categories.map((c) => [c.id!, c])), [categories]);
}

/** Trigger a browser download of text content. */
export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
