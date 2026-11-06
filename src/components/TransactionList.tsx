import { useState } from 'react';
import { db } from '../db/db';
import { formatDate, formatMoney } from '../lib/format';
import type { Category, Transaction } from '../types';
import { ConfirmDialog } from './Modal';

interface Props {
  transactions: Transaction[];
  categoryMap: Map<number, Category>;
  onEdit: (tx: Transaction) => void;
  emptyMessage?: string;
}

export function TransactionList({ transactions, categoryMap, onEdit, emptyMessage = 'No transactions yet.' }: Props) {
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  if (!transactions.length) {
    return <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>;
  }

  return (
    <>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {transactions.map((t) => {
          const c = categoryMap.get(t.categoryId);
          return (
            <li key={t.id} className="group flex items-center gap-3 py-2.5">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
                style={{ backgroundColor: `${c?.color ?? '#94a3b8'}22` }}
                aria-hidden
              >
                {c?.icon ?? '❔'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.note || c?.name || 'Unknown'}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {c?.name ?? 'Unknown'} · {formatDate(t.date)}
                </p>
              </div>
              <span
                className={`shrink-0 text-sm font-semibold tabular-nums ${
                  t.type === 'income' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {t.type === 'income' ? '+' : '−'}
                {formatMoney(t.amount)}
              </span>
              <div className="flex shrink-0 gap-1 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                <button
                  className="btn px-2 py-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => onEdit(t)}
                  aria-label="Edit transaction"
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  className="btn px-2 py-1 text-slate-500 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:text-rose-400 dark:hover:bg-rose-950"
                  onClick={() => setDeleting(t)}
                  aria-label="Delete transaction"
                  title="Delete"
                >
                  🗑
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={!!deleting}
        title="Delete transaction?"
        message={
          deleting && (
            <>
              This will permanently delete <strong>{formatMoney(deleting.amount)}</strong>
              {deleting.note && <> ({deleting.note})</>} from {formatDate(deleting.date)}.
            </>
          )
        }
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting?.id) await db.transactions.delete(deleting.id);
          setDeleting(null);
        }}
      />
    </>
  );
}
