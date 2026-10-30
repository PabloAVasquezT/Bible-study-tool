import { Suspense, use, useState } from 'react'
import { loadBook, loadCrossReferenceInfo, loadCrossReferences, loadDevotionalDay, loadDevotionalPassages, loadDevotionals } from '../data.ts'
import type { DevotionalTime } from '../lib/articles.ts'
import { plainText, type BibleInfo } from '../lib/bible.ts'
import type { BookId } from '../lib/books.ts'
import { formatVerseRange, parseVerseRange, rangeLabel, type VerseRange, type VerseRef } from '../lib/crossrefs.ts'
import { passagePath } from '../lib/passage.ts'
import { ErrorBoundary } from '../pages.tsx'
import { Link } from '../router.tsx'
import { ArticleBody } from './Article.tsx'
import { Sheet, SheetFooter } from './Sheet.tsx'

/** How many references to show before "Show all". */
const FIRST_SHOWN = 10
/** How many verses of a range the preview quotes. */
const PREVIEW_VERSES = 3
/** The devotional whose readings are shown with their verse. */
export const VERSE_DEVOTIONAL = 'spurgeon'

interface VersePanelProps {
  bible: BibleInfo
  /** The verse to study, or undefined when the panel is closed. */
  verse?: VerseRef
  onClose: () => void
}

/** What there is to read about a verse: Spurgeon's readings on it, then its cross-references. */
export function VersePanel({ bible, verse, onClose }: VersePanelProps) {
  const bookName = (book: BookId): string => bible.books.find((info) => info.id === book)?.name ?? book
  const key = verse && formatVerseRange({ start: verse })
  return (
    <Sheet open={verse !== undefined} title={verse ? rangeLabel({ start: verse }, bookName) : ''} onClose={onClose}>
      {verse && key && (
        <ErrorBoundary resetKey={key} fallback={(error) => <p className="text-ink-muted">{error.message}</p>}>
          <Suspense fallback={<ListSkeleton />}>
            <DevotionalReadings key={`devotional ${key}`} verse={verse} onClose={onClose} />
            <CrossReferenceList key={key} bible={bible} verse={verse} bookName={bookName} onClose={onClose} />
          </Suspense>
        </ErrorBoundary>
      )}
    </Sheet>
  )
}

function DevotionalReadings({ verse, onClose }: { verse: VerseRef; onClose: () => void }) {
  const readings = use(loadDevotionalPassages(VERSE_DEVOTIONAL))[formatVerseRange({ start: verse })] ?? []
  const info = use(loadDevotionals()).find((devotional) => devotional.id === VERSE_DEVOTIONAL)
  if (!readings.length || !info) return null
  return (
    <section className="mb-8">
      <h3 className="mb-3 text-xs font-semibold tracking-[0.15em] text-ink-muted uppercase">
        {info.author}, {info.name}
      </h3>
      <div className="space-y-4">
        {readings.map(([day, time]) => (
          <Suspense key={`${day} ${time}`} fallback={<ListSkeleton rows={1} />}>
            <DevotionalReading day={day} time={time} onClose={onClose} />
          </Suspense>
        ))}
      </div>
    </section>
  )
}

/** A reading, folded to its first paragraph until opened. */
function DevotionalReading({ day, time, onClose }: { day: string; time: DevotionalTime; onClose: () => void }) {
  const [open, setOpen] = useState(false)
  const reading = use(loadDevotionalDay(VERSE_DEVOTIONAL, day))?.[time]
  if (!reading) return null
  // The first block quotes the verse being studied, so it is left out.
  const blocks = reading.blocks.slice(1)
  return (
    <article className="rounded-xl border border-line p-4">
      <p className="mb-2 font-sans text-sm font-semibold">{reading.title}</p>
      <div className={open ? undefined : 'folded'}>
        <ArticleBody blocks={open ? blocks : blocks.slice(0, 1)} onNavigate={onClose} />
      </div>
      <button type="button" onClick={() => setOpen(!open)} className="text-sm font-semibold text-accent hover:underline">
        {open ? 'Show less' : 'Read the whole reading'}
      </button>
    </article>
  )
}

interface CrossReferenceListProps {
  bible: BibleInfo
  verse: VerseRef
  bookName: (book: BookId) => string
  onClose: () => void
}

function CrossReferenceList({ bible, verse, bookName, onClose }: CrossReferenceListProps) {
  const file = use(loadCrossReferences(verse.book))
  const info = use(loadCrossReferenceInfo())
  const [showAll, setShowAll] = useState(false)
  const targets = file.chapters[verse.chapter - 1]?.[verse.verse - 1] ?? []
  const shown = showAll ? targets : targets.slice(0, FIRST_SHOWN)

  return (
    <>
      <h3 className="mb-2 text-xs font-semibold tracking-[0.15em] text-ink-muted uppercase">Cross references</h3>
      {targets.length === 0 ? (
        <p className="text-ink-muted">There are no cross references for this verse.</p>
      ) : (
        <ul lang={bible.language} className="-mx-3">
          {shown.map((target) => {
            const range = parseVerseRange(target)
            if (!range) return null
            return (
              <li key={target}>
                <Link to={passagePath({ bible: bible.id, ...range.start })} onClick={onClose} className="block rounded-lg px-3 py-2 hover:bg-sunken">
                  <span className="font-semibold text-accent">{rangeLabel(range, bookName)}</span>
                  <ErrorBoundary resetKey={target} fallback={() => null}>
                    <Suspense fallback={<div className="mt-1.5 h-4 w-3/4 animate-pulse rounded bg-sunken" />}>
                      <Preview bible={bible.id} range={range} />
                    </Suspense>
                  </ErrorBoundary>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {!showAll && targets.length > FIRST_SHOWN && (
        <button type="button" onClick={() => setShowAll(true)} className="mt-3 text-sm font-semibold text-accent hover:underline">
          Show all {targets.length}
        </button>
      )}

      <SheetFooter>
        {info.name}, {info.attribution} ·{' '}
        <a href={info.licenseUrl} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
          {info.license}
        </a>{' '}
        ·{' '}
        <Link to="/credits" className="underline-offset-2 hover:underline">
          Credits
        </Link>
      </SheetFooter>
    </>
  )
}

/** The first verses of a range, in the Bible being read. */
function Preview({ bible, range }: { bible: string; range: VerseRange }) {
  const book = use(loadBook(bible, range.start.book))
  const verses = book.chapters[range.start.chapter - 1]?.verses ?? []
  const { start, end } = range
  const last = end && end.book === start.book && end.chapter === start.chapter ? end.verse : end ? verses.length : start.verse
  const quoted = verses.slice(start.verse - 1, Math.min(last, start.verse - 1 + PREVIEW_VERSES))
  const text = quoted.map((verse) => plainText(verse.text)).filter(Boolean).join(' ')
  if (!text) return null
  const more = end !== undefined && (end.chapter !== start.chapter || end.book !== start.book || last - start.verse + 1 > PREVIEW_VERSES)
  return <p className="mt-0.5 line-clamp-3 font-serif text-[0.95rem] leading-snug text-ink-muted">{more ? `${text} …` : text}</p>
}

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i}>
          <div className="mb-2 h-4 w-28 rounded bg-sunken" />
          <div className="h-4 rounded bg-sunken" style={{ width: `${65 + ((i * 23) % 30)}%` }} />
        </div>
      ))}
    </div>
  )
}
