# Every Pesewa

A personal finance / expense tracker that runs entirely in your browser. Amounts are in Ghanaian Cedi (GH₵).
Your data is stored locally in IndexedDB and never leaves your device.

**Live:** https://every-pesewa-c6sj.onrender.com (hosted on Render; every push to `main` redeploys it)

## Run it

```bash
npm install
npm run dev      # open the URL Vite prints (usually http://localhost:5173)
npm test         # unit tests for stats + CSV logic
npm run build    # type-check + production build into dist/
```

## Features

- **Overview**: monthly income, expenses and balance, recent transactions, spending donut, budget alerts
- **Transactions**: add/edit/delete, search, filter by type/category/date range, sort, export (filtered) to CSV
- **Budgets**: monthly limit per expense category; bars turn amber at 80% and red when over; copy last month's budgets
- **Reports**: spending by category, 12-month income vs expenses, savings rate, income sources, with date-range presets
- **Settings**: manage categories (name, icon, colour), CSV import with column mapping and preview, JSON backup/restore, clear all data
- Dark mode, mobile layout, and the `N` keyboard shortcut to add a transaction

## CSV import

Works with this app's own export or with bank and MoMo statements. You map the columns (Date, Amount, and optionally Type, Category, Note).
- If there is no Type column, negative amounts become expenses and positive amounts become income.
- Ambiguous dates are read day-first (`05/11/2026` = 5 November).
- Unknown category names are created automatically. Invalid rows are skipped, and the reason is shown.

## Structure

- `src/db/db.ts`: Dexie schema, default categories, budget/import/backup helpers
- `src/lib/stats.ts`, `src/lib/csv.ts`: pure logic (unit tested)
- `src/components/`, `src/pages/`: React UI (Tailwind CSS v4, Recharts)

Amounts are stored as integer pesewas to avoid floating-point rounding errors.
