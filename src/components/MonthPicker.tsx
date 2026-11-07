import { currentMonth, monthLabel, shiftMonth } from '../lib/format';
import { IconChevronLeft, IconChevronRight } from './Icons';

/** Arrows are 40px square: comfortable tap targets on phones without crowding the desktop header. */
const ARROW = 'flex h-10 w-10 cursor-pointer items-center justify-center text-muted transition-colors hover:bg-sunken hover:text-ink';

export function MonthPicker({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const isCurrent = month === currentMonth();
  return (
    <div className="flex items-center gap-3">
      {!isCurrent && (
        <button className="link text-sm" onClick={() => onChange(currentMonth())}>
          This month
        </button>
      )}
      <div className="flex items-center overflow-hidden rounded-[10px] border border-line bg-surface">
        <button className={ARROW} onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month">
          <IconChevronLeft size={18} />
        </button>
        {/* Announce the new month when the arrows change it. */}
        <span className="min-w-36 border-x border-line px-3 text-center text-sm leading-10 font-semibold" aria-live="polite">
          {monthLabel(month)}
        </span>
        <button className={ARROW} onClick={() => onChange(shiftMonth(month, 1))} aria-label="Next month">
          <IconChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
