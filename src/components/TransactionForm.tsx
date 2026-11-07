import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { db } from '../db/db';
import { parseAmount, toDecimal, todayISO } from '../lib/format';
import { useCategories } from '../lib/hooks';
import type { Transaction, TxType } from '../types';
import { IconTrash } from './Icons';
import { Modal } from './Modal';

interface Props {
  open: boolean;
  /** Transaction being edited, or null to create a new one. */
  editing: Transaction | null;
  onClose: () => void;
}

export function TransactionForm({ open, editing, onClose }: Props) {
  const categories = useCategories();
  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(editing?.type ?? 'expense');
    setAmount(editing ? toDecimal(editing.amount) : '');
    setCategoryId(editing?.categoryId ?? '');
    setDate(editing?.date ?? todayISO());
    setNote(editing?.note ?? '');
    setError('');
    setConfirmDelete(false);
  }, [open, editing]);

  async function remove() {
    if (editing?.id) await db.transactions.delete(editing.id);
    onClose();
  }

  const options = useMemo(
    () => categories.filter((c) => c.type === type).sort((a, b) => a.name.localeCompare(b.name)),
    [categories, type],
  );

  // Keep the selected category valid for the chosen type.
  useEffect(() => {
    if (!options.length) return;
    if (categoryId === '' || !options.some((c) => c.id === categoryId)) setCategoryId(options[0].id!);
  }, [options, categoryId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const pesewas = parseAmount(amount);
    if (pesewas === null || pesewas <= 0) return setError('Enter an amount greater than zero.');
    if (categoryId === '') return setError('Choose a category.');
    if (!date) return setError('Choose a date.');
    const data = { type, amount: pesewas, categoryId, date, note: note.trim() };
    if (editing?.id) await db.transactions.update(editing.id, data);
    else await db.transactions.add({ ...data, createdAt: Date.now() });
    onClose();
  }

  return (
    <Modal title={editing ? 'Edit transaction' : 'Add transaction'} open={open} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-sunken p-1" role="group" aria-label="Type">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              onClick={() => setType(t)}
              className={`cursor-pointer rounded-[9px] py-2 text-sm font-semibold transition-colors ${
                type === t
                  ? `bg-surface shadow-[0_1px_2px_rgb(6_18_13/0.12)] ${t === 'income' ? 'text-gain' : 'text-ink'}`
                  : 'text-muted hover:text-ink'
              }`}
            >
              {t === 'expense' ? 'Money out' : 'Money in'}
            </button>
          ))}
        </div>

        {/* The amount is the one thing every entry needs, so it gets the most room. */}
        <div>
          <label className="label" htmlFor="tx-amount">
            Amount
          </label>
          <div
            className={`flex items-baseline gap-2 rounded-xl border bg-surface px-4 py-3 focus-within:ring-2 focus-within:ring-brand/25 ${
              error && !parseAmount(amount) ? 'border-loss' : 'border-line focus-within:border-brand'
            }`}
          >
            <span className="text-lg font-semibold text-faint" aria-hidden>
              GH₵
            </span>
            <input
              id="tx-amount"
              className="w-full min-w-0 bg-transparent text-[32px] leading-none font-bold tracking-tight outline-none placeholder:text-faint/60 focus-visible:outline-none"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={!!error && !parseAmount(amount)}
              aria-describedby={error ? 'tx-error' : undefined}
              data-autofocus
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
          <div>
            <label className="label" htmlFor="tx-category">
              Category
            </label>
            <select id="tx-category" className="input" value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tx-date">
              Date
            </label>
            <input id="tx-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="tx-note">
            Note <span className="font-normal text-faint">(optional)</span>
          </label>
          <input id="tx-note" className="input" placeholder="e.g. Trotro to Madina" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {error && (
          <p id="tx-error" role="alert" className="text-sm font-medium text-loss">
            {error}
          </p>
        )}

        {confirmDelete ? (
          // Two-step delete inside the form, rather than a second dialog stacked on this one.
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-loss-soft px-4 py-3" role="alert">
            <p className="text-sm font-medium text-loss">Delete this transaction for good?</p>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={() => setConfirmDelete(false)}>
                Keep it
              </button>
              <button type="button" className="btn-danger" onClick={remove}>
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2 pt-1">
            {editing?.id && (
              <button type="button" className="btn mr-auto px-2 text-loss hover:bg-loss-soft" onClick={() => setConfirmDelete(true)}>
                <IconTrash size={17} />
                Delete
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary min-w-28">
              {editing ? 'Save changes' : 'Add transaction'}
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
}
