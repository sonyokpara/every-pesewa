import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Catches errors from lazy-loaded pages (e.g. a chunk that fails to download
 * while offline, or after a redeploy replaced the old chunk files) so the
 * header and nav stay usable instead of the whole app going blank.
 * React.lazy caches a failed import, so a full reload is the reliable recovery.
 */
export class PageErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Page failed to load', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="card mx-auto max-w-md p-6 text-center">
        <p className="font-semibold">This page couldn't be loaded.</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Check your connection, then reload. Your data is safe — it's stored in this browser.
        </p>
        <button className="btn-primary mt-4" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}
