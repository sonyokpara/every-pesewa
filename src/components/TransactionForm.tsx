import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { db } from '../db/db';
import { parseAmount, toDecimal, todayISO } from '../lib/format';
import { useCategories } from '../lib/hooks';
import type { Transaction, TxType } from '../types';
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

  useEffect(() => {
    if (!open) return;
    setType(editing?.type ?? 'expense');
    setAmount(editing ? toDecimal(editing.amount) : '');
    setCategoryId(editing?.categoryId ?? '');
    setDate(editing?.date ?? todayISO());
    setNote(editing?.note ?? '');
    setError('');
  }, [open, editing]);

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
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-md py-1.5 text-sm font-medium capitalize transition ${
                type === t
                  ? t === 'expense'
                    ? 'bg-white text-rose-600 shadow dark:bg-slate-900 dark:text-rose-400'
                    : 'bg-white text-emerald-700 shadow dark:bg-slate-900 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div>
          <label className="label" htmlFor="tx-amount">
            Amount (GH₵)
          </label>
          <input
            id="tx-amount"
            className="input text-lg font-semibold"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="tx-category">
              Category
            </label>
            <select
              id="tx-category"
              className="input"
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
            >
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
            Note
          </label>
          <input
            id="tx-note"
            className="input"
            placeholder="e.g. Trotro to Madina"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {editing ? 'Save changes' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
