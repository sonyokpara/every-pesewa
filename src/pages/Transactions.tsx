import { useMemo, useState } from 'react';
import { IconDownload, IconSearch } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
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
    <div className="space-y-6">
      <PageHeader title="Transactions">
        <button
          className="btn-secondary"
          disabled={!filtered.length}
          onClick={() => downloadFile(`transactions-${todayISO()}.csv`, exportTransactionsCsv(filtered, categories), 'text/csv')}
        >
          <IconDownload size={17} />
          Export {hasFilters ? 'filtered' : 'all'} to CSV
        </button>
      </PageHeader>

      <div className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="f-search">
            Search
          </label>
          <div className="relative">
            <IconSearch size={17} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
            <input
              id="f-search"
              type="search"
              className="input pl-9"
              placeholder="Note or category"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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

      <section className="card" aria-label="Results">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line pb-4 text-sm">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <p className="font-semibold">
              {filtered.length} transaction{filtered.length === 1 ? '' : 's'}
            </p>
            <p className="text-muted tabular-nums">
              In <span className="font-semibold text-gain">{formatMoney(sum.income)}</span>
            </p>
            <p className="text-muted tabular-nums">
              Out <span className="font-semibold text-ink">{formatMoney(sum.expense)}</span>
            </p>
            {hasFilters && (
              <button className="link" onClick={clear}>
                Clear filters
              </button>
            )}
          </div>
          <select className="input w-auto py-1.5" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="amount-desc">Largest amount</option>
            <option value="amount-asc">Smallest amount</option>
          </select>
        </div>
        {all === undefined ? (
          <p className="py-10 text-center text-sm text-muted">Loading…</p>
        ) : (
          <TransactionList
            transactions={filtered}
            categoryMap={catMap}
            onEdit={onEdit}
            emptyMessage={hasFilters ? 'No transactions match these filters.' : 'No transactions yet. Use Add at the top to record your first one.'}
          />
        )}
      </section>
    </div>
  );
}
