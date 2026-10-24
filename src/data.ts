// Loads the static data in public/data/. Promises are cached so React's use() can read them.
import type { BibleInfo, BibleSummary, BookFile } from './lib/bible.ts'
import type { BookId } from './lib/books.ts'
import type { CrossReferenceFile, CrossReferenceInfo } from './lib/crossrefs.ts'
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
