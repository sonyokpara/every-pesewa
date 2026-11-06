import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ChangeEvent } from 'react';
import { CsvImportDialog } from '../components/CsvImportDialog';
import { ConfirmDialog, Modal } from '../components/Modal';
import { PALETTE, clearAllData, db, deleteCategory, exportBackup, restoreBackup, type Backup } from '../db/db';
import { describeBackupErrors, validateBackup } from '../lib/backup';
import { exportTransactionsCsv } from '../lib/csv';
import { todayISO } from '../lib/format';
import { downloadFile, useCategories } from '../lib/hooks';
import type { Category, TxType } from '../types';

const ICONS = ['🍲', '🚌', '🏠', '💡', '📱', '🩺', '🎬', '🛍️', '📦', '🎓', '⛪', '👶', '🐾', '✈️', '⛽', '💇', '🏋️', '🎁', '💼', '📈', '💰', '🏷️', '🧾', '💳'];

export function Settings() {
  const categories = useCategories();
  const txCount = useLiveQuery(() => db.transactions.count(), []) ?? 0;
  const usage = useLiveQuery(async () => {
    const m = new Map<number, number>();
    await db.transactions.each((t) => m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + 1));
    return m;
  }, []);

  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<Backup | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  async function exportCsv() {
    const txs = await db.transactions.toArray();
    downloadFile(`every-pesewa-${todayISO()}.csv`, exportTransactionsCsv(txs, categories), 'text/csv');
  }

  async function backup() {
    downloadFile(`every-pesewa-backup-${todayISO()}.json`, JSON.stringify(await exportBackup(), null, 2), 'application/json');
  }

  async function onRestoreFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setNotice({ kind: 'error', text: "That file isn't a valid Every Pesewa backup (it isn't readable JSON)." });
      return;
    }
    const result = validateBackup(parsed);
    if (result.ok) setPendingRestore(result.backup);
    else setNotice({ kind: 'error', text: describeBackupErrors(result.errors) });
  }

  const groups: { type: TxType; title: string }[] = [
    { type: 'expense', title: 'Expense categories' },
    { type: 'income', title: 'Income categories' },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Settings</h1>

      {notice && (
        <div
          className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm ${
            notice.kind === 'ok' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
          }`}
        >
          {notice.text}
          <button onClick={() => setNotice(null)} aria-label="Dismiss" className="ml-3 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {groups.map((g) => (
          <section key={g.type} className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">{g.title}</h2>
              <button
                className="btn-secondary py-1.5"
                onClick={() =>
                  setEditing({ name: '', type: g.type, color: PALETTE[categories.length % PALETTE.length], icon: g.type === 'income' ? '💰' : '🏷️' })
                }
              >
                + New
              </button>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {categories
                .filter((c) => c.type === g.type)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: `${c.color}22` }}>
                      {c.icon}
                    </span>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                    <span className="flex-1 text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{usage?.get(c.id!) ?? 0} txns</span>
                    <button className="btn px-2 py-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}>
                      ✎
                    </button>
                    <button
                      className="btn px-2 py-1 text-slate-500 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:text-rose-400 dark:hover:bg-rose-950"
                      onClick={() => setDeleting(c)}
                      aria-label={`Delete ${c.name}`}
                    >
                      🗑
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="card space-y-4">
        <h2 className="font-semibold">Your data</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Everything is stored privately in this browser ({txCount} transaction{txCount === 1 ? '' : 's'}). Nothing is sent to a server. Make a backup now and then
          — clearing your browser data will erase it.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => setImportOpen(true)}>
            ⬆ Import CSV
          </button>
          <button className="btn-secondary" onClick={exportCsv} disabled={!txCount}>
            ⬇ Export CSV
          </button>
          <button className="btn-secondary" onClick={backup}>
            💾 Download backup (JSON)
          </button>
          <label className="btn-secondary">
            ♻ Restore backup
            <input type="file" accept=".json,application/json" className="sr-only" onChange={onRestoreFile} />
          </label>
          <button className="btn border border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950" onClick={() => setConfirmClear(true)}>
            Clear all data
          </button>
        </div>
      </section>

      <CategoryEditor category={editing} onClose={() => setEditing(null)} existing={categories} />
      <CsvImportDialog open={importOpen} onClose={() => setImportOpen(false)} />

      <ConfirmDialog
        open={!!deleting}
        title={`Delete “${deleting?.name}”?`}
        message={
          <>
            {usage?.get(deleting?.id ?? -1) ? (
              <>
                Its {usage.get(deleting!.id!)} transaction(s) will be moved to <strong>{deleting?.name === 'Other' ? 'Uncategorized' : 'Other'}</strong>.{' '}
              </>
            ) : null}
            Any budgets for this category will be removed.
          </>
        }
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await deleteCategory(deleting);
          setDeleting(null);
        }}
      />

      <ConfirmDialog
        open={confirmClear}
        title="Clear all data?"
        message="This permanently deletes every transaction, budget and custom category in this browser. Download a backup first if you might need it."
        confirmLabel="Delete everything"
        onCancel={() => setConfirmClear(false)}
        onConfirm={async () => {
          await clearAllData();
          setConfirmClear(false);
          setNotice({ kind: 'ok', text: 'All data cleared.' });
        }}
      />

      <ConfirmDialog
        open={!!pendingRestore}
        title="Restore this backup?"
        message={
          pendingRestore && (
            <>
              This replaces all current data with the backup
              {!Number.isNaN(Date.parse(pendingRestore.exportedAt)) && (
                <>
                  {' '}from <strong>{new Date(pendingRestore.exportedAt).toLocaleString()}</strong>
                </>
              )}{' '}
              ({pendingRestore.transactions.length} transactions).
            </>
          )
        }
        confirmLabel="Replace my data"
        onCancel={() => setPendingRestore(null)}
        onConfirm={async () => {
          try {
            await restoreBackup(pendingRestore!);
            setNotice({ kind: 'ok', text: 'Backup restored.' });
          } catch (err) {
            setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Restore failed.' });
          }
          setPendingRestore(null);
        }}
      />
    </div>
  );
}

function CategoryEditor({ category, onClose, existing }: { category: Category | null; onClose: () => void; existing: Category[] }) {
  const [draft, setDraft] = useState<Category | null>(category);
  const [error, setError] = useState('');
  const [prev, setPrev] = useState(category);
  if (prev !== category) {
    setPrev(category);
    setDraft(category);
    setError('');
  }
  if (!draft) return null;

  async function save() {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) return setError('Enter a name.');
    const dup = existing.some((c) => c.type === draft.type && c.id !== draft.id && c.name.toLowerCase() === name.toLowerCase());
    if (dup) return setError(`There is already a ${draft.type} category called “${name}”.`);
    if (draft.id) await db.categories.update(draft.id, { name, color: draft.color, icon: draft.icon });
    else await db.categories.add({ name, type: draft.type, color: draft.color, icon: draft.icon });
    onClose();
  }

  return (
    <Modal title={draft.id ? 'Edit category' : `New ${draft.type} category`} open onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div>
          <label className="label" htmlFor="cat-name">
            Name
          </label>
          <input id="cat-name" className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus />
        </div>
        <div>
          <span className="label">Icon</span>
          <div className="flex flex-wrap gap-1">
            {ICONS.map((i) => (
              <button
                type="button"
                key={i}
                onClick={() => setDraft({ ...draft, icon: i })}
                className={`h-9 w-9 cursor-pointer rounded-lg text-lg ${draft.icon === i ? 'bg-emerald-100 ring-2 ring-emerald-500 dark:bg-emerald-900' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Colour</span>
          <div className="flex flex-wrap items-center gap-2">
            {PALETTE.map((c) => (
              <button
                type="button"
                key={c}
                aria-label={`Colour ${c}`}
                onClick={() => setDraft({ ...draft, color: c })}
                className={`h-7 w-7 cursor-pointer rounded-full ${draft.color === c ? 'ring-2 ring-slate-900 ring-offset-2 dark:ring-white dark:ring-offset-slate-900' : ''}`}
                style={{ background: c }}
              />
            ))}
            <input type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} className="h-7 w-9 cursor-pointer" aria-label="Custom colour" />
          </div>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
