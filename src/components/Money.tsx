import { formatMoney } from '../lib/format';

/**
 * A large money figure set like the face value on a note: the GH₵ symbol and the pesewas are
 * smaller than the whole cedis, so the eye lands on the part that matters. Screen readers get
 * the plain formatted string.
 */
export function Money({ value, className = '' }: { value: number; className?: string }) {
  const text = formatMoney(value);
  const m = /^(-?)([^\d]*?)([\d,]+)(\.\d+)?$/.exec(text);
  if (!m) return <span className={`tabular-nums ${className}`}>{text}</span>;
  const [, sign, symbol, whole, fraction = ''] = m;
  return (
    <span className={`inline-flex items-baseline tabular-nums ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="contents">
        {sign && <span>−</span>}
        <span className="mr-[0.12em] text-[0.5em] font-semibold opacity-75">{symbol.trim()}</span>
        <span>{whole}</span>
        <span className="text-[0.55em] opacity-75">{fraction}</span>
      </span>
    </span>
  );
}
