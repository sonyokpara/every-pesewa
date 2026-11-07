import { useEffect, useId, useRef, type ReactNode } from 'react';
import { IconClose } from './Icons';

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
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 text-ink backdrop:bg-[#06120d]/55 backdrop:backdrop-blur-[2px]"
    >
      <div
        className="flex h-full items-end justify-center sm:items-center sm:p-4"
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_24px_60px_-20px_rgb(6_18_13/0.45)] motion-safe:animate-[sheet-in_180ms_ease-out] sm:rounded-2xl sm:p-6 ${wide ? 'sm:max-w-3xl' : 'sm:max-w-md'}`}
        >
          {/* Grab handle hints that the sheet came up from the bottom on phones. */}
          <div className="mx-auto -mt-1 mb-4 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden />
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 id={titleId} className="text-xl font-bold tracking-tight">
              {title}
            </h2>
            <button className="btn-ghost -mr-2 h-9 w-9 px-0" onClick={onClose} aria-label="Close">
              <IconClose size={18} />
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
      <div className="mb-6 text-sm leading-relaxed text-muted">{message}</div>
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
