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

## What this is

"Cedi Tracker" is a client-only React 18 + TypeScript + Vite expense tracker. It has no backend. All data lives in the browser's IndexedDB through Dexie. Currency is Ghanaian Cedi (GHS).

## Architecture

**Money is integer pesewas everywhere** (1 GHS = 100 pesewas): in `Transaction.amount`, `Budget.limit`, and every stats function. Convert only at the edges. `parseAmount` (in `src/lib/format.ts`) turns input into pesewas. `formatMoney`/`toDecimal` turn pesewas back into display strings. Never store or sum floats.

**Dates are strings.** Transactions use ISO `YYYY-MM-DD`, and budgets and the month pickers use `YYYY-MM`. Month filtering works by string prefix (`inMonth` uses `date.startsWith(month)`), so keep these formats exact. The CSV import reads ambiguous dates day-first.

**Data layer (`src/db/db.ts`).** It holds the Dexie schema (`transactions`, `categories`, `budgets`; budgets have a unique `[categoryId+month]` index). Default categories are seeded in the `populate` hook. Operations that touch more than one table are helpers here and run inside `db.transaction('rw', ...)`: `applyImport` (creates missing categories, matched by case-insensitive name and type), `deleteCategory` (moves that category's transactions to the type's "Other" fallback and deletes its budgets), `restoreBackup`, `clearAllData`, `copyBudgets`, and `setBudget`. If you change the schema, add a new `db.version(n)` rather than editing version 1, because users already have existing databases.

**Reactivity.** The UI reads data through `useLiveQuery` hooks in `src/lib/hooks.ts` (`useTransactions`, `useCategories`, `useBudgets`). Components write to `db` directly and the live queries re-render automatically, so there is no global state store. `useTransactions` returns `undefined` while loading; the other hooks return a shared empty array.

**Pure logic (`src/lib/stats.ts`, `src/lib/csv.ts`).** Aggregations (totals, by-category, monthly trend, budget progress with an 80% warning threshold) and CSV export, parsing, column-mapping and validation are pure functions over plain arrays, with no Dexie access. This is the only unit-tested code. Keep new calculations here, not in components.

**App shell (`src/App.tsx`).** Routing is hash-based (`#dashboard`, `#transactions`, `#budgets`, `#reports`, `#settings`) with no router library. App owns the shared state: the selected month (shared by Dashboard and Budgets), the theme (a `dark` class on `<html>`, saved in localStorage), and the single global `TransactionForm` modal. Pages open that modal through the `onEdit` callback. The `N` key opens it to add a transaction.

**Styling.** Tailwind CSS v4 is set up through `@tailwindcss/vite`, so there is no tailwind config file. Custom utilities (`card`, `input`, `btn`, `btn-primary`, `btn-secondary`, `btn-danger`, `label`) and the class-based `dark` variant are defined in `src/index.css`. Charts use Recharts.
