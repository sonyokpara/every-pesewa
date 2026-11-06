import { currentMonth, monthLabel, shiftMonth } from '../lib/format';

/** Arrow buttons are 40px on phones (comfortable tap targets) and compact from sm up. */
const ARROW = 'btn-secondary h-10 w-10 px-0 sm:h-auto sm:w-auto sm:px-2.5';

export function MonthPicker({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const isCurrent = month === currentMonth();
  return (
    <div className="flex items-center gap-1">
      <button className={ARROW} onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month">
        ‹
      </button>
      {/* Announce the new month when the arrows change it. */}
      <span className="min-w-36 text-center text-sm font-semibold" aria-live="polite">
        {monthLabel(month)}
      </span>
      <button className={ARROW} onClick={() => onChange(shiftMonth(month, 1))} aria-label="Next month">
        ›
      </button>
      {!isCurrent && (
        <button className="btn px-2 text-xs text-emerald-700 hover:underline dark:text-emerald-400" onClick={() => onChange(currentMonth())}>
          This month
        </button>
      )}
    </div>
  );
}
