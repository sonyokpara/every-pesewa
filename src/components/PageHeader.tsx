import type { ReactNode } from 'react';

/** Page title with optional controls (month picker, export…) aligned to its right. */
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <h1 className="text-[30px] leading-tight font-bold tracking-tight sm:text-[34px]">{title}</h1>
      {children}
    </div>
  );
}

/** Heading row for a panel: title on the left, a link or action on the right. */
export function PanelHeader({ id, title, children }: { id?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="text-[17px] font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </div>
  );
}
