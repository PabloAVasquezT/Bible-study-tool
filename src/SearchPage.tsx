import { Fragment, Suspense, use, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { AppNav } from './components/AppNav.tsx'
import { Search } from './components/icons/index.tsx'
import { VersionMenu } from './components/VersionMenu.tsx'
import { loadBibleInfo, loadBibles, loadBook, searchVerses } from './data.ts'
import { InlineFlag, type BibleInfo, type Inline } from './lib/bible.ts'
import type { BookId } from './lib/books.ts'
import { passagePath, searchPath } from './lib/passage.ts'
import { matchesWord, parseQuery, splitWords, verseLocator, type SearchTerm, type VerseLocation } from './lib/search.ts'
import { Link, navigate } from './router.tsx'

/** Results shown at first, and added by each "Show more". */
const PAGE_SIZE = 25

export function SearchPage({ bible, query }: { bible: string; query: string }) {
  const bibles = use(loadBibles())
  const info = use(loadBibleInfo(bible))
  const [draft, setDraft] = useState(query)

  // Keep the box in step when the query changes through the history.
  useEffect(() => setDraft(query), [query])

  useEffect(() => {
    document.title = `${query ? `${query} – ` : ''}Search (${info.abbreviation}) · Bible Study Tool`
    document.documentElement.lang = info.language
  }, [query, info])

  const submit = (event: FormEvent): void => {
    event.preventDefault()
    navigate(searchPath(bible, draft))
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-3">
          <form role="search" onSubmit={submit} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-sunken px-3 py-1.5">
            <Search width={16} height={16} className="shrink-0 text-ink-faint" />
            <input
              type="search"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Search the ${info.abbreviation}`}
              aria-label="Search"
              enterKeyHint="search"
              autoFocus={!query}
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-faint"
            />
          </form>
          <VersionMenu bibles={bibles} current={info} hrefFor={(id) => searchPath(id, query)} />
        </div>
      </header>

      <main className="mx-auto max-w-prose px-5 pt-6 pb-12">
        {query ? (
          <Suspense fallback={<ResultsSkeleton />}>
            <Results key={`${bible} ${query}`} info={info} query={query} />
          </Suspense>
        ) : (
          <Help />
        )}
      </main>
      <AppNav current="search" />
    </div>
  )
}

function Help() {
  return (
    <div className="space-y-3 text-ink-muted">
      <p>Find the verses that contain all of your words.</p>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>
          Accents and capitals don’t matter: <code>dios</code> finds “Dios”.
        </li>
        <li>
          End a word with <code>*</code> to find every word that starts with it: <code>believ*</code>.
        </li>
        <li>
          Search a Strong’s number to find every verse it translates: <code>G26</code> or <code>H430</code>.
        </li>
      </ul>
    </div>
  )
}

function Results({ info, query }: { info: BibleInfo; query: string }) {
  const verses = use(searchVerses(info.id, query))
  const terms = useMemo(() => parseQuery(query), [query])
  const locations = useMemo(() => {
    const { locate } = verseLocator(info.books)
    return verses.map(locate)
  }, [info, verses])
  const [book, setBook] = useState<BookId>()
  const [limit, setLimit] = useState(PAGE_SIZE)
  const chips = useRef<HTMLDivElement>(null)

  // Keep the chosen book's chip in view in the scrolling row.
  useEffect(() => {
    chips.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [book])

  const counts = new Map<BookId, number>()
  for (const location of locations) counts.set(location.book, (counts.get(location.book) ?? 0) + 1)
  const bookName = (id: BookId): string => info.books.find((b) => b.id === id)?.name ?? id
  const filtered = book ? locations.filter((location) => location.book === book) : locations
  const shown = filtered.slice(0, limit)

  // Results are in Bible order, so a page usually needs only a few books.
  const groups: { book: BookId; locations: VerseLocation[] }[] = []
  for (const location of shown) {
    const last = groups.at(-1)
    if (last?.book === location.book) last.locations.push(location)
    else groups.push({ book: location.book, locations: [location] })
  }

  if (!locations.length) {
    return (
      <div className="space-y-4">
        <p className="font-semibold">No verses found for “{query}”.</p>
        <Help />
      </div>
    )
  }

  const choose = (choice: BookId | undefined): void => {
    setBook(choice)
    setLimit(PAGE_SIZE)
  }

  return (
    <>
      <p className="mb-3 text-sm text-ink-muted">
        {locations.length.toLocaleString()} {locations.length === 1 ? 'verse' : 'verses'}
        {book && ` · ${filtered.length.toLocaleString()} in ${bookName(book)}`}
      </p>

      {counts.size > 1 && (
        <div ref={chips} className="no-scrollbar -mx-5 mb-6 flex gap-2 overflow-x-auto px-5 text-sm" role="group" aria-label="Filter by book">
          <Chip selected={!book} onClick={() => choose(undefined)}>
            All
          </Chip>
          {[...counts].map(([id, count]) => (
            <Chip key={id} selected={book === id} onClick={() => choose(book === id ? undefined : id)}>
              {bookName(id)} <span className="text-ink-faint">{count}</span>
            </Chip>
          ))}
        </div>
      )}

      {groups.map((group, index) => (
        <section key={`${group.book} ${index}`} className="mb-6">
          <h2 className="mb-2 font-sans text-xs font-semibold tracking-[0.15em] text-ink-muted uppercase">{bookName(group.book)}</h2>
          <Suspense fallback={<ResultsSkeleton rows={Math.min(group.locations.length, 4)} />}>
            <BookResults info={info} book={group.book} locations={group.locations} terms={terms} />
          </Suspense>
        </section>
      ))}

      {filtered.length > limit && (
        <button
          type="button"
          onClick={() => setLimit(limit + PAGE_SIZE)}
          className="w-full rounded-xl border border-line py-3 text-sm font-semibold text-accent hover:bg-sunken"
        >
          Show more ({(filtered.length - limit).toLocaleString()} left)
        </button>
      )}
    </>
  )
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`shrink-0 rounded-full border px-3 py-1 whitespace-nowrap ${selected ? 'border-accent bg-accent-soft text-accent' : 'border-line hover:bg-sunken'}`}
    >
      {children}
    </button>
  )
}

function BookResults({ info, book, locations, terms }: { info: BibleInfo; book: BookId; locations: VerseLocation[]; terms: SearchTerm[] }) {
  const file = use(loadBook(info.id, book))
  return (
    <ul className="-mx-3">
      {locations.map(({ chapter, verse }) => {
        const text = file.chapters[chapter - 1]?.verses[verse - 1]?.text ?? []
        return (
          <li key={`${chapter}:${verse}`}>
            <Link to={passagePath({ bible: info.id, book, chapter, verse })} className="block rounded-lg px-3 py-2 hover:bg-sunken">
              <span className="font-sans text-sm font-semibold text-accent">
                {chapter}:{verse}
              </span>{' '}
              <span className="font-serif leading-relaxed">
                <Highlighted inlines={text} terms={terms} />
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/** Verse text with the matching words marked. Notes are left out. */
function Highlighted({ inlines, terms }: { inlines: Inline[]; terms: SearchTerm[] }) {
  const strongs = new Set(terms.filter((term) => term.kind === 'strong').map((term) => term.value))
  const marked = (text: string, key: string | number) =>
    splitWords(text).map((part, index) =>
      part.word && matchesWord(part.word, terms) ? (
        <mark key={`${key} ${index}`} className="search-match">
          {part.text}
        </mark>
      ) : (
        <Fragment key={`${key} ${index}`}>{part.text}</Fragment>
      )
    )

  return inlines.map((inline, index) => {
    if (typeof inline === 'string') return <Fragment key={index}>{marked(inline, index)}</Fragment>
    if ('note' in inline) return null
    const italic = (inline.f ?? 0) & InlineFlag.added
    const content = inline.s?.split(' ').some((strong) => strongs.has(strong)) ? (
      <mark className="search-match">{inline.t}</mark>
    ) : (
      marked(inline.t, index)
    )
    return italic ? (
      <em key={index}>{content}</em>
    ) : (
      <Fragment key={index}>{content}</Fragment>
    )
  })
}

function ResultsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-4 rounded bg-sunken" style={{ width: `${70 + ((i * 31) % 28)}%` }} />
      ))}
    </div>
  )
}
