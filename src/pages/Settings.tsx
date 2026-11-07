import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ChangeEvent } from 'react';
import { CsvImportDialog } from '../components/CsvImportDialog';
import { IconClose, IconDownload, IconPencil, IconPlus, IconRestore, IconTrash, IconUpload } from '../components/Icons';
import { ConfirmDialog, Modal } from '../components/Modal';
import { PageHeader, PanelHeader } from '../components/PageHeader';
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
    <div className="space-y-6">
      <PageHeader title="Settings" />

      {notice && (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
            notice.kind === 'ok' ? 'bg-brand-soft text-brand-text' : 'bg-loss-soft text-loss'
          }`}
        >
          <span className="pt-1.5">{notice.text}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss" className="btn -mr-2 h-8 w-8 shrink-0 px-0 hover:bg-black/5">
            <IconClose size={16} />
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {groups.map((g) => (
          <section key={g.type} className="card" aria-labelledby={`cats-${g.type}`}>
            <PanelHeader id={`cats-${g.type}`} title={g.title}>
              <button
                className="btn-secondary py-1.5 pl-2.5"
                onClick={() =>
                  setEditing({ name: '', type: g.type, color: PALETTE[categories.length % PALETTE.length], icon: g.type === 'income' ? '💰' : '🏷️' })
                }
              >
                <IconPlus size={16} />
                New category
              </button>
            </PanelHeader>
            <ul className="-mx-2 divide-y divide-line">
              {categories
                .filter((c) => c.type === g.type)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => {
                  const n = usage?.get(c.id!) ?? 0;
                  return (
                    <li key={c.id} className="flex items-center gap-3 px-2 py-2.5">
                      {/* The tile's tint is the category colour, so a separate swatch isn't needed. */}
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2"
                        style={{ background: `${c.color}26`, borderColor: `${c.color}80` }}
                        aria-hidden
                      >
                        {c.icon}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{c.name}</span>
                      <span className="text-xs text-faint tabular-nums">
                        {n} transaction{n === 1 ? '' : 's'}
                      </span>
                      <span className="flex gap-0.5">
                        <button className="btn-ghost h-9 w-9 px-0" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`} title="Edit">
                          <IconPencil size={17} />
                        </button>
                        <button
                          className="btn-ghost h-9 w-9 px-0 hover:bg-loss-soft hover:text-loss"
                          onClick={() => setDeleting(c)}
                          aria-label={`Delete ${c.name}`}
                          title="Delete"
                        >
                          <IconTrash size={17} />
                        </button>
                      </span>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>

      <section className="card" aria-labelledby="data-heading">
        <PanelHeader id="data-heading" title="Your data" />
        <p className="max-w-prose text-sm leading-relaxed text-muted">
          Your {txCount} transaction{txCount === 1 ? ' is' : 's are'} stored only in this browser and never sent to a server. Clearing your browser
          data erases them, so download a backup now and then.
        </p>

        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Spreadsheets</h3>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" onClick={() => setImportOpen(true)}>
                <IconUpload size={17} />
                Import CSV
              </button>
              <button className="btn-secondary" onClick={exportCsv} disabled={!txCount}>
                <IconDownload size={17} />
                Export CSV
              </button>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Full backup</h3>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={backup}>
                <IconDownload size={17} />
                Download backup
              </button>
              <label className="btn-secondary focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand">
                <IconRestore size={17} />
                Restore backup
                <input type="file" accept=".json,application/json" className="sr-only" onChange={onRestoreFile} />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-loss/30 bg-loss-soft/50 px-4 py-3">
          <p className="text-sm text-muted">
            <span className="font-semibold text-ink">Clear all data.</span> Deletes every transaction, budget and category in this browser.
          </p>
          <button className="btn border border-loss/40 bg-surface text-loss hover:bg-loss-soft" onClick={() => setConfirmClear(true)}>
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
          <input id="cat-name" className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} data-autofocus />
        </div>
        <div>
          <span className="label">Icon</span>
          <div className="flex flex-wrap gap-1">
            {ICONS.map((i) => (
              <button
                type="button"
                key={i}
                aria-pressed={draft.icon === i}
                onClick={() => setDraft({ ...draft, icon: i })}
                className={`h-10 w-10 cursor-pointer rounded-[10px] text-lg ${draft.icon === i ? 'bg-brand-soft ring-2 ring-brand' : 'hover:bg-sunken'}`}
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
                aria-pressed={draft.color === c}
                onClick={() => setDraft({ ...draft, color: c })}
                className={`h-8 w-8 cursor-pointer rounded-full ${draft.color === c ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''}`}
                style={{ background: c }}
              />
            ))}
            <input
              type="color"
              value={draft.color}
              onChange={(e) => setDraft({ ...draft, color: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded-md border border-line bg-surface"
              aria-label="Custom colour"
            />
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-loss">
            {error}
          </p>
        )}
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
