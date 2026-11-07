import { formatMoney, monthLabel } from '../lib/format';
import type { Totals } from '../lib/stats';
import { IconPlus } from './Icons';
import { Money } from './Money';

/**
 * Guilloche rosette, the fine interwoven linework printed on banknotes. Each band is a stack of
 * closed curves r(t) = r0 + a·sin(k·t + φ) + b·sin(2k·t − φ), each curve stepping its phase by
 * half a lobe and nudging its radius out a little, so neighbours cross and weave instead of
 * sitting on top of each other. Computed once at module load.
 */
function band(r0: number, a: number, k: number, curves: number, spread: number): string[] {
  const out: string[] = [];
  const steps = 900;
  for (let i = 0; i < curves; i++) {
    const phase = (i * Math.PI) / curves;
    const base = r0 + (i - curves / 2) * spread;
    let d = '';
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * 2 * Math.PI;
      const r = base + a * Math.sin(k * t + phase) + a * 0.35 * Math.sin(2 * k * t - phase);
      d += `${s ? 'L' : 'M'}${(r * Math.cos(t)).toFixed(1)} ${(r * Math.sin(t)).toFixed(1)}`;
    }
    out.push(`${d}Z`);
  }
  return out;
}
const ROSETTE = [...band(148, 14, 24, 16, 1.4), ...band(98, 10, 16, 12, 1.2), ...band(60, 6, 12, 8, 1)];

function Guilloche({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="-180 -180 360 360" className={className} aria-hidden focusable="false">
      <g fill="none" stroke="var(--gold)" strokeWidth="0.45">
        {ROSETTE.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <text x="0" y="22" textAnchor="middle" fontSize="64" fontWeight="700" fill="var(--gold)" fillOpacity="0.9" fontFamily="inherit">
        ₵
      </text>
    </svg>
  );
}

/** The month's balance, presented as the face of a cedi note: the dashboard's one bold element. */
export function BalanceNote({ totals, month, onAdd }: { totals: Totals; month: string; onAdd: () => void }) {
  const { income, expense, balance } = totals;
  const empty = income === 0 && expense === 0;
  const ratio = income > 0 ? expense / income : null;

  let caption: string;
  if (empty) caption = `Nothing recorded for ${monthLabel(month)} yet.`;
  else if (ratio === null) caption = 'No income recorded this month yet.';
  else if (ratio > 1) caption = `You spent ${formatMoney(expense - income)} more than came in.`;
  else caption = `You’ve spent ${Math.round(ratio * 100)}% of what came in.`;

  return (
    <section
      aria-labelledby="balance-heading"
      className="relative isolate overflow-hidden rounded-3xl bg-note px-6 pt-6 pb-6 text-note-ink sm:px-8 sm:pt-7"
    >
      <Guilloche className="pointer-events-none absolute top-1/2 -right-32 -z-10 h-[140%] -translate-y-1/2 opacity-30 sm:-right-10 sm:h-[135%] sm:opacity-70" />
      {/* Fine border inset from the edge, like the printed frame on a note. */}
      <div className="pointer-events-none absolute inset-2 -z-10 rounded-[18px] border border-gold/25" aria-hidden />

      <h2 id="balance-heading" className="text-sm font-medium text-note-ink/75">
        Balance
      </h2>
      <p className={`mt-1 text-[44px] leading-none font-bold tracking-tight sm:text-[60px] ${balance < 0 ? 'text-[#ffb4a6]' : ''}`}>
        <Money value={balance} />
      </p>

      {empty ? (
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
          <p className="text-sm text-note-ink/80">{caption}</p>
          <button className="btn bg-gold text-[#2a1d02] hover:brightness-105" onClick={onAdd}>
            <IconPlus size={18} />
            Add a transaction
          </button>
        </div>
      ) : (
        <div className="mt-6 max-w-xl">
          {/* Spent as a share of income. Over 100% the bar fills and turns red. */}
          <div
            className="h-1.5 overflow-hidden rounded-full bg-white/15"
            role="img"
            aria-label={caption}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${ratio === null || ratio > 1 ? 'bg-[#ff8f7d]' : 'bg-gold'}`}
              style={{ width: `${ratio === null ? (expense > 0 ? 100 : 0) : Math.min(100, ratio * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-note-ink/80">{caption}</p>
          <dl className="mt-5 grid grid-cols-2 gap-6 sm:flex sm:gap-12">
            <div className="min-w-0">
              <dt className="text-[13px] text-note-ink/70">Money in</dt>
              <dd className="mt-0.5 truncate text-xl font-semibold tabular-nums sm:text-2xl">{formatMoney(income)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[13px] text-note-ink/70">Money out</dt>
              <dd className="mt-0.5 truncate text-xl font-semibold tabular-nums sm:text-2xl">{formatMoney(expense)}</dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}
