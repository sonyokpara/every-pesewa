import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { CoinMark, IconChart, IconHome, IconList, IconMoon, IconPlus, IconSettings, IconSun, IconTarget } from './components/Icons';
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

const NAV: { id: PageId; label: string; Icon: typeof IconHome }[] = [
  { id: 'dashboard', label: 'Overview', Icon: IconHome },
  { id: 'transactions', label: 'Transactions', Icon: IconList },
  { id: 'budgets', label: 'Budgets', Icon: IconTarget },
  { id: 'reports', label: 'Reports', Icon: IconChart },
  { id: 'settings', label: 'Settings', Icon: IconSettings },
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
    // Every page change (nav, in-page links, back/forward) starts at the top.
    const onHash = () => {
      setPage(pageFromHash());
      window.scrollTo({ top: 0 });
    };
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

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = useCallback((t: Transaction) => {
    setEditing(t);
    setFormOpen(true);
  }, []);
  const closeForm = useCallback(() => setFormOpen(false), []);

  // Keyboard shortcut: "n" (either case) adds a transaction, unless the user is typing or any
  // dialog is open (e.g. the delete confirmation, which the form would otherwise stack on).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable) return;
      if (document.querySelector('dialog[open]')) return;
      e.preventDefault();
      setEditing(null);
      setFormOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <a href="#dashboard" className="flex shrink-0 items-center gap-2.5 rounded-full">
            <CoinMark size={30} />
            <span className="text-[17px] font-bold tracking-tight">Every Pesewa</span>
          </a>
          {/* Only one of the two navs is displayed at a time, so both can carry the same label. */}
          <nav className="hidden h-full flex-1 items-stretch gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                aria-current={page === n.id ? 'page' : undefined}
                className={`relative flex items-center px-3 text-sm font-medium transition-colors after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full ${
                  page === n.id ? 'text-ink after:bg-brand' : 'text-muted hover:text-ink'
                }`}
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              className="btn-ghost h-10 w-10 px-0"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </button>
            <button className="btn-primary h-10 pr-3 pl-3" onClick={openAdd} title="Add transaction (N)" aria-keyshortcuts="n">
              <IconPlus size={18} />
              Add
              <kbd
                aria-hidden
                className="ml-1 hidden rounded-md bg-white/15 px-1.5 font-sans text-[11px] leading-5 md:inline-block dark:bg-black/15"
              >
                N
              </kbd>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-7 pb-10">
        {/* Keyed by page so moving to another page clears a previous error. */}
        <PageErrorBoundary key={page}>
          <Suspense fallback={<PageSkeleton />}>
            {page === 'dashboard' && <Dashboard month={month} setMonth={setMonth} onEdit={openEdit} onAdd={openAdd} />}
            {page === 'transactions' && <Transactions onEdit={openEdit} />}
            {page === 'budgets' && <Budgets month={month} setMonth={setMonth} />}
            {page === 'reports' && <Reports />}
            {page === 'settings' && <Settings />}
          </Suspense>
        </PageErrorBoundary>
      </main>

      {/* Mobile bottom nav */}
      {/* Bottom padding keeps the links clear of the iPhone home indicator (needs viewport-fit=cover). */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Main"
      >
        {NAV.map(({ id, label, Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            aria-current={page === id ? 'page' : undefined}
            className={`flex flex-col items-center gap-1 pt-2 pb-2.5 text-[11px] font-medium ${page === id ? 'text-brand-text' : 'text-muted'}`}
          >
            <span className={`flex h-7 w-12 items-center justify-center rounded-full ${page === id ? 'bg-brand-soft' : ''}`}>
              <Icon size={20} />
            </span>
            {label}
          </a>
        ))}
      </nav>

      <TransactionForm open={formOpen} editing={editing} onClose={closeForm} />
    </div>
  );
}
