import Papa from 'papaparse';
import { format, isValid, parse } from 'date-fns';
import type { Category, Transaction, TxType } from '../types';
import { parseAmount, toDecimal } from './format';

export const EXPORT_HEADERS = ['Date', 'Type', 'Category', 'Amount', 'Note'] as const;

export function exportTransactionsCsv(txs: Transaction[], categories: Category[]): string {
  const catMap = new Map(categories.map((c) => [c.id!, c.name]));
  const rows = [...txs]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map((t) => [t.date, t.type, catMap.get(t.categoryId) ?? '', toDecimal(t.amount), t.note]);
  return Papa.unparse({ fields: [...EXPORT_HEADERS], data: rows });
}

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsvText(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });
  return { headers: result.meta.fields?.filter(Boolean) ?? [], rows: result.data };
}

export interface ColumnMapping {
  date: string;
  amount: string;
  /** Optional: column holding income/expense. If empty, the sign of the amount decides (negative = expense). */
  type: string;
  category: string;
  note: string;
}

const GUESSES: Record<keyof ColumnMapping, RegExp> = {
  date: /^(date|transaction date|txn date|value date|posted|posting date)$/i,
  amount: /^(amount|amt|value|amount \(ghs\)|ghs)$/i,
  type: /^(type|kind|dr\/cr|cr\/dr|direction|transaction type)$/i,
  category: /^(category|cat|group)$/i,
  note: /^(note|notes|description|details|narration|memo|remarks|particulars)$/i,
};

export function guessMapping(headers: string[]): ColumnMapping {
  const find = (re: RegExp) => headers.find((h) => re.test(h.trim())) ?? '';
  return {
    date: find(GUESSES.date) || find(/date/i),
    amount: find(GUESSES.amount) || find(/amount/i),
    type: find(GUESSES.type),
    category: find(GUESSES.category),
    note: find(GUESSES.note),
  };
}

const DATE_FORMATS = [
  'yyyy-MM-dd',
  'dd/MM/yyyy',
  'd/M/yyyy',
  'dd-MM-yyyy',
  'd-M-yyyy',
  'dd.MM.yyyy',
  'd MMM yyyy',
  'dd MMM yyyy',
  'd-MMM-yyyy',
  'dd-MMM-yyyy',
  'MMM d, yyyy',
  'd MMMM yyyy',
  'yyyy/MM/dd',
  'dd/MM/yy',
];

/** Parse a date string into YYYY-MM-DD. Day-first is assumed for ambiguous dates (as used in Ghana). */
export function parseDate(input: string): string | null {
  const s = input.trim().replace(/\s+/g, ' ');
  if (!s) return null;
  const iso = /^(\d{4}-\d{2}-\d{2})[T ]/.exec(s);
  const candidate = iso ? iso[1] : s;
  for (const f of DATE_FORMATS) {
    const d = parse(candidate, f, new Date(2000, 0, 1));
    if (isValid(d) && d.getFullYear() > 1900 && d.getFullYear() < 2200) return format(d, 'yyyy-MM-dd');
  }
  return null;
}

const INCOME_WORDS = /^(income|credit|cr|in|deposit|received|inflow|\+)$/i;
const EXPENSE_WORDS = /^(expense|debit|dr|out|withdrawal|payment|spent|outflow|-)$/i;

export function parseType(input: string): TxType | null {
  const s = input.trim();
  if (INCOME_WORDS.test(s)) return 'income';
  if (EXPENSE_WORDS.test(s)) return 'expense';
  return null;
}

export interface ImportRow {
  type: TxType;
  amount: number;
  date: string;
  categoryName: string;
  note: string;
}

export interface ImportError {
  /** 1-based row number as seen in a spreadsheet (header is row 1). */
  row: number;
  reason: string;
}

export interface ImportResult {
  valid: ImportRow[];
  errors: ImportError[];
}

export function buildImport(rows: Record<string, string>[], mapping: ColumnMapping): ImportResult {
  const valid: ImportRow[] = [];
  const errors: ImportError[] = [];
  rows.forEach((r, i) => {
    const rowNum = i + 2;
    const get = (col: string) => (col ? String(r[col] ?? '').trim() : '');

    const date = parseDate(get(mapping.date));
    if (!date) {
      errors.push({ row: rowNum, reason: `Invalid date "${get(mapping.date)}"` });
      return;
    }
    const rawAmount = parseAmount(get(mapping.amount));
    if (rawAmount === null || rawAmount === 0) {
      errors.push({ row: rowNum, reason: `Invalid amount "${get(mapping.amount)}"` });
      return;
    }
    let type: TxType;
    if (mapping.type) {
      const t = parseType(get(mapping.type));
      if (!t) {
        errors.push({ row: rowNum, reason: `Unknown type "${get(mapping.type)}" (use income or expense)` });
        return;
      }
      type = t;
    } else {
      type = rawAmount < 0 ? 'expense' : 'income';
    }
    valid.push({
      type,
      amount: Math.abs(rawAmount),
      date,
      categoryName: get(mapping.category) || 'Other',
      note: get(mapping.note),
    });
  });
  return { valid, errors };
}
