import { describe, expect, it } from 'vitest';
import type { Category, Transaction } from '../types';
import { buildImport, exportTransactionsCsv, guessMapping, parseCsvText, parseDate, parseType } from './csv';
import { parseAmount } from './format';

const cats: Category[] = [
  { id: 1, name: 'Food', type: 'expense', color: '#f00', icon: '🍲' },
  { id: 2, name: 'Salary', type: 'income', color: '#00f', icon: '💼' },
];

const txs: Transaction[] = [
  { id: 1, type: 'income', amount: 500000, categoryId: 2, date: '2026-10-01', note: 'October pay', createdAt: 1 },
  { id: 2, type: 'expense', amount: 1250, categoryId: 1, date: '2026-10-03', note: 'Waakye, "extra" shito, egg', createdAt: 2 },
];

describe('CSV round trip', () => {
  it('exports and re-imports the same transactions', () => {
    const csv = exportTransactionsCsv(txs, cats);
    expect(csv.split(/\r?\n/)[0]).toBe('Date,Type,Category,Amount,Note');

    const parsed = parseCsvText(csv);
    const mapping = guessMapping(parsed.headers);
    expect(mapping).toEqual({ date: 'Date', amount: 'Amount', type: 'Type', category: 'Category', note: 'Note' });

    const { valid, errors } = buildImport(parsed.rows, mapping);
    expect(errors).toEqual([]);
    expect(valid).toEqual([
      { type: 'income', amount: 500000, date: '2026-10-01', categoryName: 'Salary', note: 'October pay' },
      { type: 'expense', amount: 1250, date: '2026-10-03', categoryName: 'Food', note: 'Waakye, "extra" shito, egg' },
    ]);
  });
});

describe('bank statement import', () => {
  const csv = [
    'Transaction Date,Narration,Amount',
    '05/11/2026,MoMo transfer,-150.00',
    '06/11/2026,Salary credit,"5,000.00"',
    'not a date,Broken row,10',
    '07/11/2026,Zero row,0',
    '08/11/2026,Bad amount,abc',
  ].join('\n');

  it('infers type from sign, uses day-first dates, reports invalid rows', () => {
    const parsed = parseCsvText(csv);
    const mapping = guessMapping(parsed.headers);
    expect(mapping).toMatchObject({ date: 'Transaction Date', amount: 'Amount', note: 'Narration', type: '', category: '' });
    const { valid, errors } = buildImport(parsed.rows, mapping);
    expect(valid).toEqual([
      { type: 'expense', amount: 15000, date: '2026-11-05', categoryName: 'Other', note: 'MoMo transfer' },
      { type: 'income', amount: 500000, date: '2026-11-06', categoryName: 'Other', note: 'Salary credit' },
    ]);
    expect(errors.map((e) => e.row)).toEqual([4, 5, 6]);
    expect(errors[0].reason).toMatch(/date/i);
  });

  it('rejects unknown type values', () => {
    const parsed = parseCsvText('Date,Type,Amount\n2026-11-01,maybe,10');
    const { errors } = buildImport(parsed.rows, guessMapping(parsed.headers));
    expect(errors[0].reason).toMatch(/Unknown type/);
  });
});

describe('parsers', () => {
  it('parses amounts', () => {
    expect(parseAmount('1,234.56')).toBe(123456);
    expect(parseAmount('GH₵ 20')).toBe(2000);
    expect(parseAmount('(15.00)')).toBe(-1500);
    expect(parseAmount('-3')).toBe(-300);
    expect(parseAmount('0.1')).toBe(10);
    expect(parseAmount('12abc')).toBeNull();
    expect(parseAmount('')).toBeNull();
  });
  it('parses dates', () => {
    expect(parseDate('2026-11-05')).toBe('2026-11-05');
    expect(parseDate('2026-11-05T10:00:00Z')).toBe('2026-11-05');
    expect(parseDate('5/11/2026')).toBe('2026-11-05');
    expect(parseDate('5 Nov 2026')).toBe('2026-11-05');
    expect(parseDate('31/02/2026')).toBeNull();
    expect(parseDate('')).toBeNull();
  });
  it('parses types', () => {
    expect(parseType('Credit')).toBe('income');
    expect(parseType('DR')).toBe('expense');
    expect(parseType('expense')).toBe('expense');
    expect(parseType('???')).toBeNull();
  });
});
