import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { PageErrorBoundary } from './components/PageErrorBoundary';
import { PageSkeleton } from './components/Skeleton';
import { TransactionForm } from './components/TransactionForm';
import { currentMonth } from './lib/format';
import type { Transaction } from './types';

// Pages are code-split so each one (and Recharts, used only by Dashboard and
// Reports) downloads on first visit instead of in one large initial bundle.
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Transactions = lazy(() => import('./pages/Transactions').then((m) => ({ default: m.Transactions })));
const Budgets = lazy(() => import('./pages/Budgets').then((m) => ({ default: m.Budgets })));
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));

export type PageId = 'dashboard' | 'transactions' | 'budgets' | 'reports' | 'settings';

const NAV: { id: PageId; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Overview', icon: '🏠' },
  { id: 'transactions', label: 'Transactions', icon: '🧾' },
  { id: 'budgets', label: 'Budgets', icon: '🎯' },
  { id: 'reports', label: 'Reports', icon: '📊' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

const pageFromHash = (): PageId => {
  const h = window.location.hash.slice(1) as PageId;
  return NAV.some((n) => n.id === h) ? h : 'dashboard';
};

type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage unavailable */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [page, setPage] = useState<PageId>(pageFromHash);
  const [month, setMonth] = useState(currentMonth);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const navigate = useCallback((p: PageId) => {
    window.location.hash = p;
    window.scrollTo({ top: 0 });
  }, []);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = useCallback((t: Transaction) => {
    setEditing(t);
    setFormOpen(true);
  }, []);
  const closeForm = useCallback(() => setFormOpen(false), []);

  // Keyboard shortcut: "n" adds a transaction.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === 'n' && !formOpen && !e.ctrlKey && !e.metaKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
        e.preventDefault();
        setEditing(null);
        setFormOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [formOpen]);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <a href="#dashboard" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-lg text-white">₵</span>
            <span className="hidden sm:inline">Every Pesewa</span>
          </a>
          {/* Only one of the two navs is displayed at a time, so both can carry the same label. */}
          <nav className="hidden flex-1 gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                aria-current={page === n.id ? 'page' : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  page === n.id
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              className="btn-secondary px-2.5"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button className="btn-primary" onClick={openAdd} title="Add transaction (N)">
              + Add
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Keyed by page so moving to another page clears a previous error. */}
        <PageErrorBoundary key={page}>
          <Suspense fallback={<PageSkeleton />}>
            {page === 'dashboard' && <Dashboard month={month} setMonth={setMonth} onEdit={openEdit} onAdd={openAdd} navigate={navigate} />}
            {page === 'transactions' && <Transactions onEdit={openEdit} />}
            {page === 'budgets' && <Budgets month={month} setMonth={setMonth} />}
            {page === 'reports' && <Reports />}
            {page === 'settings' && <Settings />}
          </Suspense>
        </PageErrorBoundary>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-950/95" aria-label="Main">
        {NAV.map((n) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            aria-current={page === n.id ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${
              page === n.id ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <span className="text-lg" aria-hidden>
              {n.icon}
            </span>
            {n.label}
          </a>
        ))}
      </nav>

      <TransactionForm open={formOpen} editing={editing} onClose={closeForm} />
    </div>
  );
}
