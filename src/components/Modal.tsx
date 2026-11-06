import { useEffect, useId, useRef, type ReactNode } from 'react';

interface Props {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

/**
 * Modal built on the native <dialog> element: showModal() traps focus, makes the page behind
 * it inert, and turns Escape into a `cancel` event. React's `autoFocus` can't reach into a dialog
 * that isn't open yet, so mark the element to focus first with `data-autofocus` instead.
 */
export function Modal({ title, open, onClose, children, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => {
      if (dialog.open) dialog.close();
      // Put focus back on whatever opened the dialog (if it still exists).
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 text-slate-900 backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm dark:text-slate-100"
    >
      <div
        className="flex h-full items-end justify-center sm:items-center sm:p-4"
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl dark:bg-slate-900 ${wide ? 'sm:max-w-3xl' : 'sm:max-w-md'}`}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <button className="btn px-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </dialog>
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel }: ConfirmProps) {
  return (
    <Modal title={title} open={open} onClose={onCancel}>
      <div className="mb-5 text-sm text-slate-600 dark:text-slate-300">{message}</div>
      <div className="flex justify-end gap-2">
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-danger" onClick={onConfirm} data-autofocus>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
