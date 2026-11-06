import type { Backup } from '../db/db';
import type { Budget, Category, Transaction, TxType } from '../types';

export type BackupValidation = { ok: true; backup: Backup } | { ok: false; errors: string[] };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isPosInt = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) > 0;
const isType = (v: unknown): v is TxType => v === 'income' || v === 'expense';

/** True for a real calendar date in YYYY-MM-DD form (rejects e.g. 2026-02-30). */
export function isIsoDate(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export const isMonth = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

/**
 * Check a parsed backup file thoroughly before it is allowed to replace the
 * user's data. Every record must have the right fields and types, money must
 * be positive integer pesewas, ids must be unique, and every transaction and
 * budget must point at a category in the same backup. On success, returns a
 * clean copy containing only the known fields.
 */
export function validateBackup(data: unknown): BackupValidation {
  if (!isRecord(data) || data.version !== 1) {
    return { ok: false, errors: ['it is not an Every Pesewa backup file (version 1).'] };
  }
  const { transactions, categories, budgets } = data;
  if (!Array.isArray(transactions) || !Array.isArray(categories) || !Array.isArray(budgets)) {
    return { ok: false, errors: ['it is missing the transactions, categories or budgets list.'] };
  }

  const errors: string[] = [];
  const err = (msg: string) => errors.push(msg);

  const cleanCats: Category[] = [];
  const catIds = new Set<number>();
  categories.forEach((c, i) => {
    const at = `category ${i + 1}`;
    if (!isRecord(c)) return err(`${at} is not a valid record.`);
    if (!isPosInt(c.id)) return err(`${at} has an invalid id.`);
    if (catIds.has(c.id)) return err(`${at} reuses id ${c.id}.`);
    catIds.add(c.id);
    if (typeof c.name !== 'string' || !c.name.trim()) return err(`${at} has no name.`);
    if (!isType(c.type)) return err(`${at} ("${c.name}") has an invalid type.`);
    if (typeof c.color !== 'string' || typeof c.icon !== 'string') return err(`${at} ("${c.name}") has an invalid color or icon.`);
    cleanCats.push({ id: c.id, name: c.name, type: c.type, color: c.color, icon: c.icon });
  });

  const cleanTxs: Transaction[] = [];
  const txIds = new Set<number>();
  transactions.forEach((t, i) => {
    const at = `transaction ${i + 1}`;
    if (!isRecord(t)) return err(`${at} is not a valid record.`);
    if (t.id !== undefined) {
      if (!isPosInt(t.id)) return err(`${at} has an invalid id.`);
      if (txIds.has(t.id)) return err(`${at} reuses id ${t.id}.`);
      txIds.add(t.id);
    }
    if (!isType(t.type)) return err(`${at} has an invalid type.`);
    if (!isPosInt(t.amount)) return err(`${at} has an invalid amount (must be a positive whole number of pesewas).`);
    if (!isPosInt(t.categoryId) || !catIds.has(t.categoryId)) return err(`${at} points to a category that isn't in the backup.`);
    if (!isIsoDate(t.date)) return err(`${at} has an invalid date.`);
    if (typeof t.note !== 'string') return err(`${at} has an invalid note.`);
    if (typeof t.createdAt !== 'number' || !Number.isFinite(t.createdAt)) return err(`${at} has an invalid creation time.`);
    cleanTxs.push({
      ...(t.id !== undefined && { id: t.id as number }),
      type: t.type,
      amount: t.amount,
      categoryId: t.categoryId,
      date: t.date,
      note: t.note,
      createdAt: t.createdAt,
    });
  });

  const cleanBudgets: Budget[] = [];
  const budgetIds = new Set<number>();
  const budgetKeys = new Set<string>();
  budgets.forEach((b, i) => {
    const at = `budget ${i + 1}`;
    if (!isRecord(b)) return err(`${at} is not a valid record.`);
    if (b.id !== undefined) {
      if (!isPosInt(b.id)) return err(`${at} has an invalid id.`);
      if (budgetIds.has(b.id)) return err(`${at} reuses id ${b.id}.`);
      budgetIds.add(b.id);
    }
    if (!isPosInt(b.categoryId) || !catIds.has(b.categoryId)) return err(`${at} points to a category that isn't in the backup.`);
    if (!isMonth(b.month)) return err(`${at} has an invalid month.`);
    if (!isPosInt(b.limit)) return err(`${at} has an invalid limit (must be a positive whole number of pesewas).`);
    const key = `${b.categoryId}|${b.month}`;
    if (budgetKeys.has(key)) return err(`${at} duplicates another budget for the same category and month.`);
    budgetKeys.add(key);
    cleanBudgets.push({
      ...(b.id !== undefined && { id: b.id as number }),
      categoryId: b.categoryId,
      month: b.month,
      limit: b.limit,
    });
  });

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    backup: {
      app: 'cedi-tracker',
      version: 1,
      exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
      transactions: cleanTxs,
      categories: cleanCats,
      budgets: cleanBudgets,
    },
  };
}

/** One readable sentence for the UI, e.g. "...: transaction 3 has an invalid date (and 2 more problems)." */
export function describeBackupErrors(errors: string[]): string {
  const first = errors[0].replace(/\.$/, '');
  const more = errors.length > 1 ? ` (and ${errors.length - 1} more problem${errors.length > 2 ? 's' : ''})` : '';
  return `This file is not a valid Every Pesewa backup: ${first}${more}. Your data has not been changed.`;
}
