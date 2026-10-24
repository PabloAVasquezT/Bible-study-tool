import { useEffect, useRef, type ReactNode } from 'react'
import { ArrowLeft, X } from './icons/index.tsx'

interface SheetProps {
  open: boolean
  title: string
  onClose: () => void
  /** Shows a back button when set. */
  onBack?: () => void
  children: ReactNode
}

/** A bottom sheet on phones and a centered dialog on larger screens. */
export function Sheet({ open, title, onClose, onBack, children }: SheetProps) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    else if (!open && element.open) element.close()
  }, [open])

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(event) => event.target === dialog.current && onClose()}
      className="mx-0 mt-auto mb-0 w-full max-w-none rounded-t-2xl border-t border-line bg-surface text-ink backdrop:bg-black/40 sm:m-auto sm:max-w-lg sm:rounded-2xl sm:border sm:shadow-xl"
    >
      <div className="flex max-h-[85dvh] flex-col pb-[env(safe-area-inset-bottom)] sm:max-h-[80dvh]">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-2">
          {onBack ? (
            <button type="button" onClick={onBack} className="icon-button" aria-label="Back">
              <ArrowLeft />
            </button>
          ) : (
            <span className="w-10" />
          )}
          <h2 className="min-w-0 flex-1 truncate text-center font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="icon-button" aria-label="Close">
            <X />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pt-5 pb-6">{open && children}</div>
      </div>
    </dialog>
  )
}

/** The source and license line at the bottom of a sheet. */
export function SheetFooter({ children }: { children: ReactNode }) {
  return <footer className="mt-6 border-t border-line pt-3 text-xs text-ink-faint">{children}</footer>
}
