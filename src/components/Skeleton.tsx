import type { ReactNode } from 'react';

/** Grey placeholder blocks shown while data loads, so the page never flashes fake zeros or empty states. */

function Block({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 motion-reduce:animate-none dark:bg-slate-800 ${className}`} />;
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
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Block className="h-8 w-36" />
          <Block className="h-9 w-52" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card space-y-2">
              <Block className="h-3 w-24" />
              <Block className="h-7 w-32" />
            </div>
          ))}
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
      <div className="space-y-5">
        <Block className="h-8 w-40" />
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
