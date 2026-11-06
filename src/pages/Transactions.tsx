import { useMemo, useState } from 'react';
import { TransactionList } from '../components/TransactionList';
import { exportTransactionsCsv } from '../lib/csv';
import { formatMoney, todayISO } from '../lib/format';
import { downloadFile, useCategories, useCategoryMap, useTransactions } from '../lib/hooks';
import { inRange, totals } from '../lib/stats';
import type { Transaction, TxType } from '../types';

type Sort = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export function Transactions({ onEdit }: { onEdit: (t: Transaction) => void }) {
  const all = useTransactions();
  const categories = useCategories();
  const catMap = useCategoryMap(categories);

  const [search, setSearch] = useState('');
  const [type, setType] = useState<TxType | ''>('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<Sort>('date-desc');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = inRange(all ?? [], from || undefined, to || undefined).filter(
      (t) =>
        (!type || t.type === type) &&
        (categoryId === '' || t.categoryId === categoryId) &&
        (!q || t.note.toLowerCase().includes(q) || (catMap.get(t.categoryId)?.name.toLowerCase().includes(q) ?? false)),
    );
    const [key, dir] = sort.split('-') as ['date' | 'amount', 'asc' | 'desc'];
    const m = dir === 'asc' ? 1 : -1;
    return list.sort((a, b) =>
      key === 'date' ? m * (a.date.localeCompare(b.date) || a.createdAt - b.createdAt) : m * (a.amount - b.amount),
    );
  }, [all, search, type, categoryId, from, to, sort, catMap]);

  const sum = useMemo(() => totals(filtered), [filtered]);
  const hasFilters = search || type || categoryId !== '' || from || to;
  const visibleCats = categories
    .filter((c) => !type || c.type === type)
    .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));

  function clear() {
    setSearch('');
    setType('');
    setCategoryId('');
    setFrom('');
    setTo('');
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <button
          className="btn-secondary"
          disabled={!filtered.length}
          onClick={() => downloadFile(`transactions-${todayISO()}.csv`, exportTransactionsCsv(filtered, categories), 'text/csv')}
        >
          ⬇ Export {hasFilters ? 'filtered' : 'all'} to CSV
        </button>
      </div>

      <div className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="f-search">
            Search
          </label>
          <input id="f-search" className="input" placeholder="Note or category…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="f-type">
            Type
          </label>
          <select
            id="f-type"
            className="input"
            value={type}
            onChange={(e) => {
              setType(e.target.value as TxType | '');
              setCategoryId('');
            }}
          >
            <option value="">All</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-cat">
            Category
          </label>
          <select id="f-cat" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">All</option>
            {visibleCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
                {!type ? ` (${c.type})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-from">
            From
          </label>
          <input id="f-from" type="date" className="input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="f-to">
            To
          </label>
          <input id="f-to" type="date" className="input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <section className="card">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 text-sm dark:border-slate-800">
          <p className="text-slate-600 dark:text-slate-300">
            <strong>{filtered.length}</strong> transaction{filtered.length === 1 ? '' : 's'} ·{' '}
            <span className="text-emerald-700 dark:text-emerald-400">+{formatMoney(sum.income)}</span> ·{' '}
            <span className="text-rose-600 dark:text-rose-400">−{formatMoney(sum.expense)}</span>
            {hasFilters && (
              <button className="ml-3 text-emerald-700 hover:underline dark:text-emerald-400" onClick={clear}>
                Clear filters
              </button>
            )}
          </p>
          <select className="input w-auto py-1.5" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="amount-desc">Largest amount</option>
            <option value="amount-asc">Smallest amount</option>
          </select>
        </div>
        {all === undefined ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        ) : (
          <TransactionList
            transactions={filtered}
            categoryMap={catMap}
            onEdit={onEdit}
            emptyMessage={hasFilters ? 'No transactions match these filters.' : 'No transactions yet. Tap “+ Add” to get started.'}
          />
        )}
      </section>
    </div>
  );
}
