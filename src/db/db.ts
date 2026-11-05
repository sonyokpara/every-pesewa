import Dexie, { type EntityTable } from 'dexie';
import type { Budget, Category, Transaction } from '../types';
import type { ImportRow } from '../lib/csv';

export const db = new Dexie('cedi-tracker') as Dexie & {
  transactions: EntityTable<Transaction, 'id'>;
  categories: EntityTable<Category, 'id'>;
  budgets: EntityTable<Budget, 'id'>;
};

db.version(1).stores({
  transactions: '++id, type, categoryId, date, createdAt',
  categories: '++id, type, name',
  budgets: '++id, &[categoryId+month], month',
});

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Food', type: 'expense', color: '#f97316', icon: '🍲' },
  { name: 'Transport', type: 'expense', color: '#3b82f6', icon: '🚌' },
  { name: 'Rent', type: 'expense', color: '#8b5cf6', icon: '🏠' },
  { name: 'Utilities', type: 'expense', color: '#eab308', icon: '💡' },
  { name: 'Airtime/Data', type: 'expense', color: '#06b6d4', icon: '📱' },
  { name: 'Health', type: 'expense', color: '#ef4444', icon: '🩺' },
  { name: 'Entertainment', type: 'expense', color: '#ec4899', icon: '🎬' },
  { name: 'Shopping', type: 'expense', color: '#14b8a6', icon: '🛍️' },
  { name: 'Other', type: 'expense', color: '#64748b', icon: '📦' },
  { name: 'Salary', type: 'income', color: '#10b981', icon: '💼' },
  { name: 'Business', type: 'income', color: '#22c55e', icon: '📈' },
  { name: 'Gifts', type: 'income', color: '#a855f7', icon: '🎁' },
  { name: 'Other', type: 'income', color: '#94a3b8', icon: '💰' },
];

db.on('populate', (tx) => {
  tx.table('categories').bulkAdd(DEFAULT_CATEGORIES);
});

export async function clearAllData() {
  await db.transaction('rw', db.transactions, db.categories, db.budgets, async () => {
    await db.transactions.clear();
    await db.budgets.clear();
    await db.categories.clear();
    await db.categories.bulkAdd(DEFAULT_CATEGORIES);
  });
}

export interface Backup {
  app: 'cedi-tracker';
  version: 1;
  exportedAt: string;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
}

export async function exportBackup(): Promise<Backup> {
  return {
    app: 'cedi-tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions: await db.transactions.toArray(),
    categories: await db.categories.toArray(),
    budgets: await db.budgets.toArray(),
  };
}

export async function restoreBackup(data: Backup) {
  if (
    data?.version !== 1 ||
    !Array.isArray(data.transactions) ||
    !Array.isArray(data.categories) ||
    !Array.isArray(data.budgets)
  ) {
    throw new Error('This file is not a valid Cedi Tracker backup.');
  }
  await db.transaction('rw', db.transactions, db.categories, db.budgets, async () => {
    await db.transactions.clear();
    await db.categories.clear();
    await db.budgets.clear();
    await db.categories.bulkAdd(data.categories);
    await db.transactions.bulkAdd(data.transactions);
    await db.budgets.bulkAdd(data.budgets);
  });
}

/** Copy one month's budgets into another (skips categories that already have a budget). */
export async function copyBudgets(fromMonth: string, toMonth: string) {
  const prev = await db.budgets.where('month').equals(fromMonth).toArray();
  const existing = new Set(
    (await db.budgets.where('month').equals(toMonth).toArray()).map((b) => b.categoryId),
  );
  const toAdd = prev
    .filter((b) => !existing.has(b.categoryId))
    .map((b) => ({ categoryId: b.categoryId, month: toMonth, limit: b.limit }));
  if (toAdd.length) await db.budgets.bulkAdd(toAdd);
  return toAdd.length;
}

/** Create/update a budget. A limit of 0 or less removes it. */
export async function setBudget(categoryId: number, month: string, limit: number) {
  const existing = await db.budgets.where('[categoryId+month]').equals([categoryId, month]).first();
  if (limit <= 0) {
    if (existing?.id) await db.budgets.delete(existing.id);
    return;
  }
  if (existing?.id) await db.budgets.update(existing.id, { limit });
  else await db.budgets.add({ categoryId, month, limit });
}

export const PALETTE = ['#f97316', '#3b82f6', '#8b5cf6', '#eab308', '#06b6d4', '#ef4444', '#ec4899', '#14b8a6', '#10b981', '#a855f7', '#84cc16', '#f43f5e'];

/** Save imported rows, creating any categories that don't exist yet (matched by name + type, case-insensitive). */
export async function applyImport(rows: ImportRow[]) {
  return db.transaction('rw', db.transactions, db.categories, async () => {
    const cats = await db.categories.toArray();
    const key = (name: string, type: string) => `${type}|${name.trim().toLowerCase()}`;
    const ids = new Map(cats.map((c) => [key(c.name, c.type), c.id!]));
    let created = 0;
    const now = Date.now();
    const txs: Transaction[] = [];
    for (const [i, r] of rows.entries()) {
      const k = key(r.categoryName, r.type);
      let id = ids.get(k);
      if (id === undefined) {
        id = (await db.categories.add({
          name: r.categoryName.trim(),
          type: r.type,
          color: PALETTE[(cats.length + created) % PALETTE.length],
          icon: r.type === 'income' ? '💰' : '🏷️',
        })) as number;
        ids.set(k, id);
        created++;
      }
      txs.push({ type: r.type, amount: r.amount, categoryId: id, date: r.date, note: r.note, createdAt: now + i });
    }
    await db.transactions.bulkAdd(txs);
    return { imported: txs.length, categoriesCreated: created };
  });
}

/** Delete a category. Its transactions move to that type's "Other" category; its budgets are removed. */
export async function deleteCategory(cat: Category) {
  await db.transaction('rw', db.transactions, db.categories, db.budgets, async () => {
    const candidates = await db.categories.where('type').equals(cat.type).toArray();
    let fallback = candidates.find((c) => c.name === 'Other' && c.id !== cat.id);
    if (!fallback) {
      const name = cat.name === 'Other' ? 'Uncategorized' : 'Other';
      const id = await db.categories.add({ name, type: cat.type, color: '#64748b', icon: '📦' });
      fallback = { id, name, type: cat.type, color: '#64748b', icon: '📦' };
    }
    await db.transactions.where('categoryId').equals(cat.id!).modify({ categoryId: fallback.id! });
    await db.budgets.filter((b) => b.categoryId === cat.id).delete();
    await db.categories.delete(cat.id!);
  });
}
