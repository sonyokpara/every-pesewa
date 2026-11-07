import { useEffect, useRef, useState, type ReactNode } from 'react';
import { db } from '../db/db';
import { formatDate, formatMoney } from '../lib/format';
import type { Category, Transaction } from '../types';
import { IconPencil, IconTrash } from './Icons';
import { ConfirmDialog, FOCUS_LOST_EVENT } from './Modal';

interface Props {
  transactions: Transaction[];
  categoryMap: Map<number, Category>;
  onEdit: (tx: Transaction) => void;
  emptyMessage?: string;
  /** Optional call to action shown under the empty message, e.g. an "Add" button. */
  emptyAction?: ReactNode;
}

export function TransactionList({ transactions, categoryMap, onEdit, emptyMessage = 'No transactions yet.', emptyAction }: Props) {
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const emptyRef = useRef<HTMLDivElement>(null);
  // The row that last had focus in this list, by id and position.
  const lastFocus = useRef<{ id: number; index: number } | null>(null);

  // Deleting the focused row (from its Delete button or the edit form) removes the element that
  // had focus, and the browser drops focus to <body>. Move it to the row that took its place (or
  // the one above, or the empty message) so keyboard and screen-reader users keep their place.
  // This runs both when the list re-renders without the row and when a dialog closes and can't
  // return focus to its opener; whichever happens last finds focus on <body>.
  useEffect(() => {
    function restore() {
      const last = lastFocus.current;
      if (!last || transactions.some((t) => t.id === last.id)) return;
      const active = document.activeElement;
      if (active && active !== document.body) return;
      lastFocus.current = null;
      const rows = listRef.current?.querySelectorAll<HTMLElement>(':scope > li > button:first-child');
      const target = rows?.length ? rows[Math.min(last.index, rows.length - 1)] : emptyRef.current;
      target?.focus();
    }
    restore();
    document.addEventListener(FOCUS_LOST_EVENT, restore);
    return () => document.removeEventListener(FOCUS_LOST_EVENT, restore);
  }, [transactions]);

  if (!transactions.length) {
    return (
      <div ref={emptyRef} tabIndex={-1} className="rounded-xl bg-sunken px-4 py-10 text-center">
        <p className="text-sm text-muted">{emptyMessage}</p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <>
      <ul
        ref={listRef}
        className="-mx-2 divide-y divide-line"
        onFocus={(e) => {
          const li = (e.target as HTMLElement).closest('li');
          const index = li ? Array.prototype.indexOf.call(e.currentTarget.children, li) : -1;
          if (index >= 0 && transactions[index]?.id !== undefined) lastFocus.current = { id: transactions[index].id!, index };
        }}
        onBlur={(e) => {
          // Forget the row once focus genuinely moves elsewhere. Moving into a dialog the row
          // opened doesn't count, and a removed element's blur has no relatedTarget.
          const next = e.relatedTarget as HTMLElement | null;
          if (next && !e.currentTarget.contains(next) && !next.closest('dialog')) lastFocus.current = null;
        }}
      >
        {transactions.map((t) => {
          const c = categoryMap.get(t.categoryId);
          const income = t.type === 'income';
          return (
            <li key={t.id} className="group flex items-center gap-1 rounded-lg [@media(hover:hover)]:hover:bg-sunken/60">
              {/* The whole row opens the transaction for editing; on phones that is the only way in
                  (Delete lives in the edit form there), which leaves the row room for the note. */}
              <button
                type="button"
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg px-2 py-3 text-left"
                onClick={() => onEdit(t)}
                aria-label={`Edit ${t.note || c?.name || 'transaction'}, ${income ? 'income' : 'expense'} ${formatMoney(t.amount)}, ${formatDate(t.date)}`}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                  style={{ backgroundColor: `${c?.color ?? '#94a3b8'}26` }}
                  aria-hidden
                >
                  {c?.icon ?? '❔'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{t.note || c?.name || 'Unknown'}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {t.note ? `${c?.name ?? 'Unknown'}, ` : ''}
                    {formatDate(t.date)}
                  </span>
                </span>
                {/* Money out is the normal case, so it stays in ink; only income gets colour. */}
                <span className={`shrink-0 text-[15px] font-semibold tabular-nums ${income ? 'text-gain' : ''}`}>
                  {income ? '+' : '−'}
                  {formatMoney(t.amount)}
                </span>
              </button>
              {/* Hide-until-hover only where hover exists; touch tablets always see the actions. */}
              <div className="hidden shrink-0 gap-0.5 pr-1 sm:flex [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:transition [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-within:opacity-100">
                <button className="btn-ghost h-9 w-9 px-0" onClick={() => onEdit(t)} aria-label="Edit transaction" title="Edit">
                  <IconPencil size={17} />
                </button>
                <button
                  className="btn-ghost h-9 w-9 px-0 hover:bg-loss-soft hover:text-loss"
                  onClick={() => setDeleting(t)}
                  aria-label="Delete transaction"
                  title="Delete"
                >
                  <IconTrash size={17} />
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
              This permanently deletes <strong className="text-ink">{formatMoney(deleting.amount)}</strong>
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
