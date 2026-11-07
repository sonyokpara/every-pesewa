import type { ReactNode } from 'react';

/** Grey placeholder blocks shown while data loads, so the page never flashes fake zeros or empty states. */

function Block({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-sunken motion-reduce:animate-none ${className}`} />;
}

function Status({ children }: { children: ReactNode }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div aria-hidden>{children}</div>
    </div>
  );
}

/** Same shape as the Dashboard: header, three summary cards, budget card, transactions + chart. */
export function DashboardSkeleton() {
  return (
    <Status>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Block className="h-10 w-44" />
          <Block className="h-10 w-60" />
        </div>
        {/* Same footprint as the balance note. */}
        <div className="space-y-4 rounded-3xl bg-note/15 px-6 py-7 sm:px-8">
          <Block className="h-4 w-20" />
          <Block className="h-12 w-64" />
          <Block className="mt-6 h-1.5 w-full max-w-xl" />
          <Block className="h-7 w-72" />
        </div>
        <div className="card space-y-3">
          <Block className="h-4 w-40" />
          <Block className="h-3 w-full" />
          <div className="grid gap-x-8 gap-y-4 pt-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Block key={i} className="h-8" />
            ))}
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="card space-y-3 lg:col-span-3">
            <Block className="h-4 w-44" />
            {[0, 1, 2, 3].map((i) => (
              <Block key={i} className="h-10" />
            ))}
          </div>
          <div className="card space-y-3 lg:col-span-2">
            <Block className="h-4 w-40" />
            <Block className="mx-auto h-40 w-40 rounded-full" />
          </div>
        </div>
      </div>
    </Status>
  );
}

/** Generic page placeholder for the lazy-load Suspense fallback. */
export function PageSkeleton() {
  return (
    <Status>
      <div className="space-y-6">
        <Block className="h-10 w-44" />
        <div className="card space-y-3">
          <Block className="h-4 w-1/3" />
          <Block className="h-10" />
          <Block className="h-10" />
          <Block className="h-10" />
        </div>
      </div>
    </Status>
  );
}
