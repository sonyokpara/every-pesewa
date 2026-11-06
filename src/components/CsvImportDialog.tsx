import { useMemo, useState, type ChangeEvent } from 'react';
import { applyImport } from '../db/db';
import { buildImport, guessMapping, parseCsvText, type ColumnMapping, type ParsedCsv } from '../lib/csv';
import { formatDate, formatMoney } from '../lib/format';
import { Modal } from './Modal';

const FIELDS: { key: keyof ColumnMapping; label: string; required: boolean; hint?: string }[] = [
  { key: 'date', label: 'Date', required: true },
  { key: 'amount', label: 'Amount', required: true },
  { key: 'type', label: 'Type', required: false, hint: 'If not set: negative amounts = expense, positive = income' },
  { key: 'category', label: 'Category', required: false, hint: 'If not set: "Other". New names become new categories' },
  { key: 'note', label: 'Note / description', required: false },
];

export function CsvImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [fileName, setFileName] = useState('');
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ imported: number; categoriesCreated: number; skipped: number } | null>(null);
  const [loadError, setLoadError] = useState('');

  const result = useMemo(() => (csv && mapping?.date && mapping.amount ? buildImport(csv.rows, mapping) : null), [csv, mapping]);

  function reset() {
    setFileName('');
    setCsv(null);
    setMapping(null);
    setDone(null);
    setLoadError('');
  }

  function close() {
    reset();
    onClose();
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setDone(null);
    setLoadError('');
    try {
      const parsed = parseCsvText(await file.text());
      if (!parsed.headers.length || !parsed.rows.length) throw new Error('The file has no rows or no header line.');
      setFileName(file.name);
      setCsv(parsed);
      setMapping(guessMapping(parsed.headers));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not read that file.');
    }
  }

  async function doImport() {
    if (!result?.valid.length) return;
    setBusy(true);
    try {
      const res = await applyImport(result.valid);
      setDone({ ...res, skipped: result.errors.length });
      setCsv(null);
      setMapping(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Import transactions from CSV" open={open} onClose={close} wide>
      {done ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            ✅ Imported <strong>{done.imported}</strong> transaction{done.imported === 1 ? '' : 's'}
            {done.categoriesCreated > 0 && <>, created {done.categoriesCreated} new categor{done.categoriesCreated === 1 ? 'y' : 'ies'}</>}
            {done.skipped > 0 && <>, skipped {done.skipped} invalid row{done.skipped === 1 ? '' : 's'}</>}.
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={reset}>
              Import another file
            </button>
            <button className="btn-primary" onClick={close}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center text-sm hover:border-emerald-500 hover:bg-emerald-50/50 dark:border-slate-700 dark:hover:bg-emerald-950/30">
              <span className="text-2xl" aria-hidden>
                📄
              </span>
              <span className="font-medium">{fileName || 'Choose a CSV file'}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Exported from this app, a spreadsheet, or your bank / MoMo statement</span>
              <input type="file" accept=".csv,text/csv" className="sr-only" onChange={onFile} />
            </label>
            {loadError && <p className="mt-2 text-sm text-rose-600">{loadError}</p>}
          </div>

          {csv && mapping && (
            <>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Match your columns</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="label" htmlFor={`map-${f.key}`}>
                        {f.label} {f.required && <span className="text-rose-500">*</span>}
                      </label>
                      <select
                        id={`map-${f.key}`}
                        className="input"
                        value={mapping[f.key]}
                        onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                      >
                        <option value="">{f.required ? 'Select a column…' : '(none)'}</option>
                        {csv.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                      {f.hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{f.hint}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {result && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">
                    Preview{' '}
                    <span className="font-normal text-slate-500 dark:text-slate-400">
                      · {result.valid.length} ready, {result.errors.length} with problems
                    </span>
                  </h3>
                  {result.valid.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-500 dark:text-slate-400 dark:bg-slate-800/60">
                          <tr>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Type</th>
                            <th className="px-3 py-2">Category</th>
                            <th className="px-3 py-2 text-right">Amount</th>
                            <th className="px-3 py-2">Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {result.valid.slice(0, 5).map((r, i) => (
                            <tr key={i}>
                              <td className="whitespace-nowrap px-3 py-1.5">{formatDate(r.date)}</td>
                              <td className={`px-3 py-1.5 capitalize ${r.type === 'income' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{r.type}</td>
                              <td className="px-3 py-1.5">{r.categoryName}</td>
                              <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{formatMoney(r.amount)}</td>
                              <td className="max-w-48 truncate px-3 py-1.5 text-slate-500 dark:text-slate-400">{r.note}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {result.valid.length > 5 && (
                        <p className="border-t border-slate-100 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 dark:border-slate-800">
                          …and {result.valid.length - 5} more
                        </p>
                      )}
                    </div>
                  )}
                  {result.errors.length > 0 && (
                    <details className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                      <summary className="cursor-pointer font-medium">
                        {result.errors.length} row{result.errors.length === 1 ? '' : 's'} will be skipped
                      </summary>
                      <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-xs">
                        {result.errors.map((e) => (
                          <li key={e.row}>
                            Row {e.row}: {e.reason}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button className="btn-secondary" onClick={close}>
                  Cancel
                </button>
                <button className="btn-primary" disabled={!result?.valid.length || busy} onClick={doImport}>
                  {busy ? 'Importing…' : `Import ${result?.valid.length ?? 0} transaction${result?.valid.length === 1 ? '' : 's'}`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
