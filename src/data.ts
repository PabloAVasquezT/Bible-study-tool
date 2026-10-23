// Loads the static data in public/data/. Promises are cached so React's use() can read them.
import type { BibleInfo, BookFile } from './lib/bible.ts'
import type { BookId } from './lib/books.ts'

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

export function loadBibleInfo(bible: string): Promise<BibleInfo> {
  return load(`bibles/${bible}/index.json`)
}

export function loadBook(bible: string, book: BookId): Promise<BookFile> {
  return load(`bibles/${bible}/${book}.json`)
}
