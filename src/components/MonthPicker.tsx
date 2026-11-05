import { currentMonth, monthLabel, shiftMonth } from '../lib/format';

export function MonthPicker({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const isCurrent = month === currentMonth();
  return (
    <div className="flex items-center gap-1">
      <button className="btn-secondary px-2.5" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month">
        ‹
      </button>
      <span className="min-w-36 text-center text-sm font-semibold">{monthLabel(month)}</span>
      <button className="btn-secondary px-2.5" onClick={() => onChange(shiftMonth(month, 1))} aria-label="Next month">
        ›
      </button>
      {!isCurrent && (
        <button className="btn px-2 text-xs text-emerald-700 hover:underline dark:text-emerald-400" onClick={() => onChange(currentMonth())}>
          Today
        </button>
      )}
    </div>
  );
}
