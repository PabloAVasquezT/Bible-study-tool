import { useEffect, useRef, useState } from 'react'
import type { BibleInfo, BookInfo } from '../lib/bible.ts'
import { OLD_TESTAMENT, type BookId } from '../lib/books.ts'
import type { ChapterRef } from '../lib/passage.ts'
import { ArrowLeft, X } from './icons/index.tsx'

interface PassagePickerProps {
  open: boolean
  info: BibleInfo
  current: ChapterRef
  onSelect: (ref: ChapterRef) => void
  onClose: () => void
}

/** Choose a book, then a chapter. Full screen on phones, a dialog on larger screens. */
export function PassagePicker({ open, info, current, onSelect, onClose }: PassagePickerProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [book, setBook] = useState<BookInfo>()

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) {
      setBook(undefined)
      element.showModal()
    } else if (!open && element.open) {
      element.close()
    }
  }, [open])

  const chooseBook = (choice: BookInfo): void => {
    if (choice.verses.length === 1) onSelect({ book: choice.id, chapter: 1 })
    else setBook(choice)
  }

  const oldTestament = new Set<BookId>(OLD_TESTAMENT)
  const sections = [
    { title: 'Old Testament', books: info.books.filter((b) => oldTestament.has(b.id)) },
    { title: 'New Testament', books: info.books.filter((b) => !oldTestament.has(b.id)) }
  ]

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(event) => event.target === dialog.current && onClose()}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-surface text-ink backdrop:bg-black/40 sm:m-auto sm:h-[min(44rem,85dvh)] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-line sm:shadow-xl"
    >
      <div className="flex h-full flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-2">
          {book ? (
            <button type="button" onClick={() => setBook(undefined)} className="icon-button" aria-label="Back to books">
              <ArrowLeft />
            </button>
          ) : (
            <span className="w-10" />
          )}
          <h2 className="flex-1 text-center font-semibold">{book ? book.name : 'Books'}</h2>
          <button type="button" onClick={onClose} className="icon-button" aria-label="Close">
            <X />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          {book ? (
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
              {book.verses.map((_, index) => {
                const chapter = index + 1
                const isCurrent = book.id === current.book && chapter === current.chapter
                return (
                  <button
                    key={chapter}
                    type="button"
                    onClick={() => onSelect({ book: book.id, chapter })}
                    className={`aspect-square rounded-lg text-sm font-medium ${isCurrent ? 'bg-accent text-surface' : 'bg-sunken hover:bg-accent-soft'}`}
                  >
                    {chapter}
                  </button>
                )
              })}
            </div>
          ) : (
            sections.map((section) => (
              <section key={section.title} className="mb-6">
                <h3 className="mb-2 text-xs font-semibold tracking-[0.15em] text-ink-muted uppercase">{section.title}</h3>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {section.books.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => chooseBook(choice)}
                      className={`truncate rounded-lg px-3 py-2 text-left text-sm ${choice.id === current.book ? 'bg-accent-soft font-semibold text-accent' : 'hover:bg-sunken'}`}
                    >
                      {choice.name}
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </dialog>
  )
}
