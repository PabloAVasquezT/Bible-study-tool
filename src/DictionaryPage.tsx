import { use, useEffect, useMemo, useState } from 'react'
import { AppNav } from './components/AppNav.tsx'
import { ArticleBody } from './components/Article.tsx'
import { Search } from './components/icons/index.tsx'
import { PageHeader } from './components/PageHeader.tsx'
import { loadDictionaries, loadDictionaryEntry, loadDictionaryTitles } from './data.ts'
import { entryFile, type DictionaryInfo } from './lib/articles.ts'
import { dictionaryPath, searchPath } from './lib/passage.ts'
import { normalizeWord } from './lib/search.ts'
import { NotFoundPage } from './pages.tsx'
import { readingBible } from './preferences.ts'
import { Link } from './router.tsx'

/** How many matches the title filter shows. */
const MAX_MATCHES = 100

function useDictionary(id: string): DictionaryInfo | undefined {
  return use(loadDictionaries()).find((dictionary) => dictionary.id === id)
}

/** Every entry, by first letter, with a filter on the titles. */
export function DictionaryPage({ dictionary }: { dictionary: string }) {
  const info = useDictionary(dictionary)
  const titles = use(loadDictionaryTitles(dictionary))
  const [filter, setFilter] = useState('')
  const [letter, setLetter] = useState('a')

  useEffect(() => {
    document.title = `${info?.name ?? 'Dictionary'} · Bible Study Tool`
    document.documentElement.lang = 'en'
  }, [info])

  const letters = useMemo(() => [...new Set(titles.map(([id]) => entryFile(id)))], [titles])
  const query = normalizeWord(filter.trim())
  const shown = useMemo(() => {
    if (!query) return titles.filter(([id]) => entryFile(id) === letter)
    // Titles that start with the query first, then those that contain it.
    const matches = titles.filter(([, title]) => normalizeWord(title).includes(query))
    const starts = matches.filter(([, title]) => normalizeWord(title).startsWith(query))
    return [...starts, ...matches.filter((match) => !starts.includes(match))].slice(0, MAX_MATCHES)
  }, [titles, query, letter])

  if (!info) return <NotFoundPage />

  return (
    <div className="min-h-dvh">
      <PageHeader title={info.name} />
      <main className="mx-auto max-w-prose px-5 pt-5 pb-8">
        <label className="mb-4 flex items-center gap-2 rounded-lg bg-sunken px-3 py-2">
          <Search width={16} height={16} className="shrink-0 text-ink-faint" />
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={`Find among ${titles.length.toLocaleString()} entries`}
            aria-label="Find an entry"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-faint"
          />
        </label>

        {!query && (
          <div className="no-scrollbar -mx-5 mb-4 flex gap-1 overflow-x-auto px-5" role="group" aria-label="Letters">
            {letters.map((first) => (
              <button
                key={first}
                type="button"
                onClick={() => setLetter(first)}
                aria-pressed={first === letter}
                className={`h-9 min-w-9 shrink-0 rounded-lg text-sm font-semibold uppercase ${first === letter ? 'bg-accent text-surface' : 'text-ink-muted hover:bg-sunken'}`}
              >
                {first === '_' ? '#' : first}
              </button>
            ))}
          </div>
        )}

        {shown.length ? (
          <ul className="-mx-3">
            {shown.map(([id, title]) => (
              <li key={id}>
                <Link to={dictionaryPath(dictionary, id)} className="block rounded-lg px-3 py-2 hover:bg-sunken">
                  {title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted">No entry matches “{filter}”.</p>
        )}
      </main>
      <AppNav current="dictionary" />
    </div>
  )
}

export function DictionaryEntryPage({ dictionary, entry }: { dictionary: string; entry: string }) {
  const info = useDictionary(dictionary)
  const article = use(loadDictionaryEntry(dictionary, entry))

  useEffect(() => {
    document.title = `${article?.title ?? 'Entry'} – ${info?.name ?? 'Dictionary'} · Bible Study Tool`
    document.documentElement.lang = 'en'
    window.scrollTo({ top: 0 })
  }, [article, info])

  if (!info || !article) return <NotFoundPage />

  return (
    <div className="min-h-dvh">
      <PageHeader title={info.name} back={{ to: dictionaryPath(dictionary), label: 'All entries' }} />
      <main className="mx-auto max-w-prose px-5 pt-8 pb-8">
        <h2 className="mb-5 font-serif text-3xl leading-tight">{article.title}</h2>
        <ArticleBody blocks={article.blocks} dictionary={dictionary} />
        <p className="mt-6">
          <Link to={searchPath(readingBible(), article.title)} className="text-sm font-semibold text-accent hover:underline">
            Search the Bible for “{article.title}”
          </Link>
        </p>
        <footer className="mt-8 border-t border-line pt-3 text-xs text-ink-faint">
          {info.name} · {info.license} ·{' '}
          <Link to="/credits" className="underline-offset-2 hover:underline">
            Credits
          </Link>
        </footer>
      </main>
      <AppNav current="dictionary" />
    </div>
  )
}
