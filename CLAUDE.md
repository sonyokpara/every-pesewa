# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                              # Vite dev server (http://localhost:5173)
npm test                                 # vitest run (all tests)
npx vitest run src/lib/csv.test.ts       # single test file
npx vitest run -t "parseDate"            # tests matching a name
npm run build                            # tsc --noEmit type-check, then vite build into dist/
```

There is no linter. `npm run build` is the type/unused-code check (`strict`, `noUnusedLocals`, `noUnusedParameters`).

## Git workflow

After every change, commit it and push to GitHub (`origin`, branch `main`). Write a descriptive commit message: a short summary line saying what changed, then a body explaining why when that isn't obvious. Keep unrelated changes in separate commits.

## What this is

"Every Pesewa" (formerly "Cedi Tracker", package `every-pesewa`) is a client-only React 18 + TypeScript + Vite expense tracker. It has no backend. All data lives in the browser's IndexedDB through Dexie. Currency is Ghanaian Cedi (GHS).

## Architecture

**Money is integer pesewas everywhere** (1 GHS = 100 pesewas): in `Transaction.amount`, `Budget.limit`, and every stats function. Convert only at the edges. `parseAmount` (in `src/lib/format.ts`) turns input into pesewas. `formatMoney`/`toDecimal` turn pesewas back into display strings. Never store or sum floats.

**Dates are strings.** Transactions use ISO `YYYY-MM-DD`, and budgets and the month pickers use `YYYY-MM`. Month filtering works by string prefix (`inMonth` uses `date.startsWith(month)`), so keep these formats exact. The CSV import reads ambiguous dates day-first.

**Data layer (`src/db/db.ts`).** The Dexie database name `'cedi-tracker'` and the backup `app: 'cedi-tracker'` marker are legacy identifiers kept on purpose: renaming the database would orphan users' existing data. (`restoreBackup` doesn't currently check `app`; keep the marker stable in case it ever does.) It holds the Dexie schema (`transactions`, `categories`, `budgets`; budgets have a unique `[categoryId+month]` index). Default categories are seeded in the `populate` hook. Operations that touch more than one table are helpers here and run inside `db.transaction('rw', ...)`: `applyImport` (creates missing categories, matched by case-insensitive name and type), `deleteCategory` (moves that category's transactions to the type's "Other" fallback and deletes its budgets), `restoreBackup`, `clearAllData`, `copyBudgets`, and `setBudget`. If you change the schema, add a new `db.version(n)` rather than editing version 1, because users already have existing databases.

**Reactivity.** The UI reads data through `useLiveQuery` hooks in `src/lib/hooks.ts` (`useTransactions`, `useCategories`, `useBudgets`). Components write to `db` directly and the live queries re-render automatically, so there is no global state store. `useTransactions` returns `undefined` while loading; the other hooks return a shared empty array.

**Pure logic (`src/lib/stats.ts`, `src/lib/csv.ts`, `src/lib/backup.ts`).** Aggregations (totals, by-category, monthly trend, budget progress with an 80% warning threshold), CSV export, parsing, column-mapping and validation, and backup validation (`validateBackup`, used by both the Settings file picker and `restoreBackup`, so a bad file is rejected before any data is cleared) are pure functions over plain arrays, with no Dexie access. This is the only unit-tested code. Keep new calculations here, not in components.

**App shell (`src/App.tsx`).** Routing is hash-based (`#dashboard`, `#transactions`, `#budgets`, `#reports`, `#settings`) with no router library. Pages are lazy-loaded with `React.lazy` + `Suspense` (inside `PageErrorBoundary`, which shows a Reload prompt if a chunk fails to load) so Recharts stays out of the initial bundle. App owns the shared state: the selected month (shared by Dashboard and Budgets), the theme (a `dark` class on `<html>`, saved in localStorage), and the single global `TransactionForm` modal. Pages open that modal through the `onEdit` callback. The `N` key opens it to add a transaction.

**Styling.** Tailwind CSS v4 is set up through `@tailwindcss/vite`, so there is no tailwind config file. Colours are semantic tokens defined once in `src/index.css` (CSS variables on `:root` and `:root.dark`, exposed through `@theme inline`): use `bg-paper`/`bg-surface`/`bg-sunken`, `text-ink`/`text-muted`/`text-faint`, `border-line`, `bg-brand`/`text-brand-text`, `text-gain` (income), `text-loss` (over budget, destructive), `text-warn`, `gold`, and `bg-note` (the dashboard's banknote panel). Don't reach for raw Tailwind palette classes (`slate-*`, `emerald-*`…) or add `dark:` variants for colour; the tokens already switch. Expenses render in ink, not red; red means over budget or destructive. Custom utilities (`card`, `input`, `btn`, `btn-primary`, `btn-secondary`, `btn-danger`, `btn-ghost`, `label`, `link`) live there too. The font is Bricolage Grotesque, bundled via `@fontsource-variable` (no Google Fonts request, matching the no-server promise). App controls use the SVG icons in `src/components/Icons.tsx`; emoji are only for category icons, which are user data. Charts use Recharts and take token colours as `var(--…)` strings.
