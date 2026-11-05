import { addMonths, format, parseISO } from 'date-fns';

const money = new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' });
const compact = new Intl.NumberFormat('en-GH', {
  style: 'currency',
  currency: 'GHS',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Format pesewas as GHS currency, e.g. 12345 → "GH₵123.45" */
export function formatMoney(pesewas: number): string {
  return money.format(pesewas / 100);
}

export function formatMoneyCompact(pesewas: number): string {
  return compact.format(pesewas / 100);
}

/**
 * Parse a user/CSV amount ("1,234.50", "GH₵ 20", "(15.00)", "-3") into pesewas.
 * Returns null if it is not a valid number.
 */
export function parseAmount(input: string | number): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) : null;
  let s = input.trim();
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/GH₵|GHS|GH¢|₵|¢|\s|,/gi, '');
  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }
  if (!/^(\d+(\.\d+)?|\.\d+)$/.test(s)) return null;
  const value = Math.round(parseFloat(s) * 100);
  return negative ? -value : value;
}

/** Pesewas → plain decimal string for inputs/CSV, e.g. 12345 → "123.45" */
export function toDecimal(pesewas: number): string {
  return (pesewas / 100).toFixed(2);
}

export const todayISO = () => format(new Date(), 'yyyy-MM-dd');
export const currentMonth = () => format(new Date(), 'yyyy-MM');
export const monthLabel = (month: string) => format(parseISO(`${month}-01`), 'MMMM yyyy');
export const shortMonthLabel = (month: string) => format(parseISO(`${month}-01`), 'MMM yy');
export const formatDate = (iso: string) => format(parseISO(iso), 'd MMM yyyy');
export const shiftMonth = (month: string, delta: number) =>
  format(addMonths(parseISO(`${month}-01`), delta), 'yyyy-MM');
