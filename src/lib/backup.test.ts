import { describe, expect, it } from 'vitest';
import { describeBackupErrors, isIsoDate, isMonth, validateBackup } from './backup';

const good = () => ({
  app: 'cedi-tracker',
  version: 1,
  exportedAt: '2026-11-06T10:00:00.000Z',
  categories: [
    { id: 1, name: 'Food', type: 'expense', color: '#f00', icon: '🍲' },
    { id: 2, name: 'Salary', type: 'income', color: '#0f0', icon: '💼' },
  ],
  transactions: [
    { id: 1, type: 'expense', amount: 1250, categoryId: 1, date: '2026-10-03', note: 'Waakye', createdAt: 1 },
    { id: 2, type: 'income', amount: 500000, categoryId: 2, date: '2026-10-01', note: '', createdAt: 2 },
  ],
  budgets: [{ id: 1, categoryId: 1, month: '2026-10', limit: 80000 }],
});

const errorsFor = (data: unknown) => {
  const r = validateBackup(data);
  return r.ok ? [] : r.errors;
};

describe('validateBackup', () => {
  it('accepts a backup exactly as exportBackup writes it', () => {
    const r = validateBackup(good());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.backup).toEqual(good());
  });

  it('accepts backups from before the rename and with an empty data set', () => {
    expect(validateBackup({ ...good(), app: 'something-else' }).ok).toBe(true);
    expect(validateBackup({ version: 1, exportedAt: '', categories: [], transactions: [], budgets: [] }).ok).toBe(true);
  });

  it('drops unknown fields and allows records without an id', () => {
    const data = good();
    (data.transactions[0] as Record<string, unknown>).extra = 'x';
    delete (data.transactions[1] as { id?: number }).id;
    const r = validateBackup(data);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.backup.transactions[0]).not.toHaveProperty('extra');
      expect(r.backup.transactions[1]).not.toHaveProperty('id');
    }
  });

  it('rejects files that are not backups at all', () => {
    for (const bad of [null, 'text', [], {}, { version: 2 }, { version: 1, transactions: [] }]) {
      expect(validateBackup(bad).ok).toBe(false);
    }
  });

  it('rejects bad transactions', () => {
    const cases: [Record<string, unknown>, RegExp][] = [
      [{ amount: 12.5 }, /amount/],
      [{ amount: 0 }, /amount/],
      [{ amount: -100 }, /amount/],
      [{ amount: '1250' }, /amount/],
      [{ type: 'transfer' }, /type/],
      [{ categoryId: 99 }, /category/],
      [{ date: '2026-02-30' }, /date/],
      [{ date: '03/10/2026' }, /date/],
      [{ note: null }, /note/],
      [{ createdAt: 'yesterday' }, /creation time/],
      [{ id: 2 }, /reuses id/],
    ];
    for (const [patch, msg] of cases) {
      const data = good();
      Object.assign(data.transactions[0], patch);
      const errors = errorsFor(data);
      expect(errors, JSON.stringify(patch)).toHaveLength(1);
      // A duplicate id is reported on the second record that uses it.
      expect(errors[0]).toMatch(patch.id ? /^transaction 2 / : /^transaction 1 /);
      expect(errors[0]).toMatch(msg);
    }
  });

  it('rejects bad categories and anything pointing at them', () => {
    const data = good();
    data.categories[0].id = 2; // Food now has id 2 too, so nothing has id 1 any more
    expect(errorsFor(data)).toEqual([
      'category 2 reuses id 2.',
      "transaction 1 points to a category that isn't in the backup.",
      "budget 1 points to a category that isn't in the backup.",
    ]);

    const noName = good();
    noName.categories[1].name = '  ';
    expect(errorsFor(noName)).toContain('category 2 has no name.');
  });

  it('rejects bad budgets', () => {
    const cases: [Record<string, unknown>, RegExp][] = [
      [{ month: '2026-13' }, /month/],
      [{ month: '2026-10-01' }, /month/],
      [{ limit: 0 }, /limit/],
      [{ limit: 99.5 }, /limit/],
      [{ categoryId: 42 }, /category/],
    ];
    for (const [patch, msg] of cases) {
      const data = good();
      Object.assign(data.budgets[0], patch);
      expect(errorsFor(data)[0], JSON.stringify(patch)).toMatch(msg);
    }
    const dup = good();
    dup.budgets.push({ id: 2, categoryId: 1, month: '2026-10', limit: 5000 });
    expect(errorsFor(dup)[0]).toMatch(/duplicates another budget/);
  });
});

describe('date helpers', () => {
  it('isIsoDate checks real calendar dates', () => {
    expect(isIsoDate('2024-02-29')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-1-05')).toBe(false);
  });
  it('isMonth checks YYYY-MM', () => {
    expect(isMonth('2026-11')).toBe(true);
    expect(isMonth('2026-00')).toBe(false);
  });
});

describe('describeBackupErrors', () => {
  it('summarises the first problem and counts the rest', () => {
    expect(describeBackupErrors(['transaction 3 has an invalid date.'])).toBe(
      'This file is not a valid Every Pesewa backup: transaction 3 has an invalid date. Your data has not been changed.',
    );
    expect(describeBackupErrors(['a.', 'b.', 'c.'])).toMatch(/: a \(and 2 more problems\)\./);
  });
});
