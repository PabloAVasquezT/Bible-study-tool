// Loads the static data in public/data/. Promises are cached so React's use() can read them.
import type { BibleInfo, BibleSummary, BookFile } from './lib/bible.ts'
import type { BookId } from './lib/books.ts'
import type { CrossReferenceFile, CrossReferenceInfo } from './lib/crossrefs.ts'
import { decodePostings, intersect, parseQuery, strongsFile, union, wordFile, type SearchTerm } from './lib/search.ts'
import { strongsLocation, type LexiconEntry, type LexiconInfo } from './lib/lexicon.ts'

const cache = new Map<string, Promise<unknown>>()

function load<T>(path: string): Promise<T> {
  let promise = cache.get(path)
  if (!promise) {
    promise = fetch(`${import.meta.env.BASE_URL}data/${path}`).then((response) => {
      if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`)
      return response.json()
    })
    // Forget failures so that a retry fetches again.
    promise.catch(() => cache.delete(path))
    cache.set(path, promise)
  }
  return promise as Promise<T>
}

export function loadBibles(): Promise<BibleSummary[]> {
  return load('bibles/index.json')
}

export function loadBibleInfo(bible: string): Promise<BibleInfo> {
  return load(`bibles/${bible}/index.json`)
}

export function loadBook(bible: string, book: BookId): Promise<BookFile> {
  return load(`bibles/${bible}/${book}.json`)
}

export function loadCrossReferenceInfo(): Promise<CrossReferenceInfo> {
  return load('crossrefs/index.json')
}

export function loadCrossReferences(book: BookId): Promise<CrossReferenceFile> {
  return load(`crossrefs/${book}.json`)
}

interface SearchIndex {
  wordFiles: string[]
  strongsFiles: string[]
}

type Postings = Record<string, number[]>

const searches = new Map<string, Promise<number[]>>()

/** The verses, numbered across the whole Bible, that match every term of a query. */
export function searchVerses(bible: string, query: string): Promise<number[]> {
  const terms = parseQuery(query)
  const key = `${bible} ${terms.map((term) => `${term.kind}:${term.value}`).join(' ')}`
  let promise = searches.get(key)
  if (!promise) {
    promise = (async () => {
      if (!terms.length) return []
      const index = await load<SearchIndex>(`search/${bible}/index.json`)
      const postingsOf = async (term: SearchTerm): Promise<number[]> => {
        const strong = term.kind === 'strong'
        const file = strong ? strongsFile(term.value) : wordFile(term.value)
        if (!(strong ? index.strongsFiles : index.wordFiles).includes(file)) return []
        const postings = await load<Postings>(`search/${bible}/${strong ? 'strongs' : 'words'}/${file}.json`)
        if (term.kind !== 'prefix') return decodePostings(postings[term.value] ?? [])
        return union(Object.keys(postings).filter((word) => word.startsWith(term.value)).map((word) => decodePostings(postings[word]!)))
      }
      const lists = await Promise.all(terms.map(postingsOf))
      return lists.reduce((all, list) => intersect(all, list))
    })()
    promise.catch(() => searches.delete(key))
    searches.set(key, promise)
  }
  return promise
}

export function loadLexicons(): Promise<LexiconInfo[]> {
  return load('lexicons/index.json')
}

export interface LexiconResult {
  info: LexiconInfo
  /** Undefined for numbers the lexicon has no entry for. */
  entry?: LexiconEntry
}

const entries = new Map<string, Promise<LexiconResult | undefined>>()

/** Looks up a Strong's number such as "G26" in the lexicon that covers it. */
export function loadLexiconEntry(strong: string): Promise<LexiconResult | undefined> {
  let promise = entries.get(strong)
  if (!promise) {
    promise = loadLexicons().then(async (lexicons) => {
      const info = lexicons.find((lexicon) => lexicon.prefix === strong[0])
      const location = info && strongsLocation(strong, info.chunkSize)
      if (!info || !location) return undefined
      const chunk = await load<Record<string, LexiconEntry>>(`lexicons/${info.id}/${location.chunk}.json`)
      return { info, entry: chunk[strong] }
    })
    promise.catch(() => entries.delete(strong))
    entries.set(strong, promise)
  }
  return promise
}
