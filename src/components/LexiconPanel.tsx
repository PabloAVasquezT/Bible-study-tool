import { Fragment, Suspense, use, useEffect, useRef, useState } from 'react'
import { loadLexiconEntry } from '../data.ts'
import type { LexiconInline } from '../lib/lexicon.ts'
import { ErrorBoundary } from '../pages.tsx'
import { Link } from '../router.tsx'
import { ArrowLeft, X } from './icons/index.tsx'

const RIGHT_TO_LEFT = new Set(['he', 'arc'])

interface LexiconPanelProps {
  /** The Strong's number to show, or undefined when the panel is closed. */
  strong?: string
  onClose: () => void
}

/** A bottom sheet on phones and a dialog on larger screens, with its own back history. */
export function LexiconPanel({ strong, onClose }: LexiconPanelProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [history, setHistory] = useState<string[]>([])
  const current = history.at(-1)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (strong) {
      setHistory([strong])
      if (!element.open) element.showModal()
    } else if (element.open) {
      element.close()
    }
  }, [strong])

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
          {history.length > 1 ? (
            <button type="button" onClick={() => setHistory(history.slice(0, -1))} className="icon-button" aria-label="Back">
              <ArrowLeft />
            </button>
          ) : (
            <span className="w-10" />
          )}
          <h2 className="flex-1 text-center font-semibold">Strong's {current}</h2>
          <button type="button" onClick={onClose} className="icon-button" aria-label="Close">
            <X />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pt-5 pb-6">
          {current && (
            <ErrorBoundary resetKey={current} fallback={(error) => <p className="text-ink-muted">{error.message}</p>}>
              <Suspense fallback={<EntrySkeleton />}>
                <EntryView strong={current} onOpen={(ref) => setHistory([...history, ref])} />
              </Suspense>
            </ErrorBoundary>
          )}
        </div>
      </div>
    </dialog>
  )
}

function EntryView({ strong, onOpen }: { strong: string; onOpen: (strong: string) => void }) {
  const result = use(loadLexiconEntry(strong))
  if (!result?.entry) return <p className="text-ink-muted">There is no dictionary entry for {strong}.</p>

  const { entry, info } = result
  const rightToLeft = RIGHT_TO_LEFT.has(entry.lang)
  return (
    <article>
      <p lang={entry.lang} dir={rightToLeft ? 'rtl' : undefined} className={`text-4xl leading-tight ${rightToLeft ? 'hebrew' : 'font-serif'}`}>
        {entry.lemma}
      </p>
      <p className="mt-1 text-ink-muted">
        {entry.translit && <span className="italic">{entry.translit}</span>}
        {entry.translit && entry.pronunciation && ' · '}
        {entry.pronunciation}
      </p>

      <Section title="Origin" inlines={entry.derivation} onOpen={onOpen} />
      <Section title="Meaning" inlines={entry.definition} onOpen={onOpen} />
      <Section title="In the King James Version" inlines={entry.usage} onOpen={onOpen} />
      <Section title="Note" inlines={entry.note} onOpen={onOpen} />

      <footer className="mt-6 border-t border-line pt-3 text-xs text-ink-faint">
        {info.name}
        {info.attribution && <>, {info.attribution}</>} ·{' '}
        <a href={info.licenseUrl} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
          {info.license}
        </a>{' '}
        ·{' '}
        <Link to="/credits" className="underline-offset-2 hover:underline">
          Credits
        </Link>
      </footer>
    </article>
  )
}

function Section({ title, inlines, onOpen }: { title: string; inlines?: LexiconInline[]; onOpen: (strong: string) => void }) {
  if (!inlines) return null
  return (
    <section className="mt-5">
      <h3 className="mb-1 text-xs font-semibold tracking-[0.15em] text-ink-muted uppercase">{title}</h3>
      <p className="font-serif leading-relaxed">
        <LexiconText inlines={inlines} onOpen={onOpen} />
      </p>
    </section>
  )
}

function LexiconText({ inlines, onOpen }: { inlines: LexiconInline[]; onOpen: (strong: string) => void }) {
  return inlines.map((inline, index) => {
    if (typeof inline === 'string') return <Fragment key={index}>{inline}</Fragment>
    if ('ref' in inline) {
      return (
        <button key={index} type="button" onClick={() => onOpen(inline.ref)} className="font-sans text-[0.9em] font-semibold text-accent hover:underline">
          {inline.ref}
        </button>
      )
    }
    if ('def' in inline) return <strong key={index} className="font-semibold">{inline.def}</strong>
    const rightToLeft = RIGHT_TO_LEFT.has(inline.lang)
    return (
      <span key={index} lang={inline.lang} dir={rightToLeft ? 'rtl' : undefined} title={inline.translit} className={rightToLeft ? 'hebrew' : undefined}>
        {inline.word}
      </span>
    )
  })
}

function EntrySkeleton() {
  return (
    <div className="animate-pulse" aria-label="Loading">
      <div className="mb-3 h-10 w-40 rounded-lg bg-sunken" />
      <div className="mb-6 h-4 w-32 rounded bg-sunken" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="mb-3 h-4 rounded bg-sunken" style={{ width: `${60 + ((i * 29) % 35)}%` }} />
      ))}
    </div>
  )
}
