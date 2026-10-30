// The KJV's chapter and verse slots, which every Bible here shares. Read from the generated
// data, so the scripts that use this must run after npm run data:bibles.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { BibleInfo } from '../../src/lib/bible.ts'
import type { BookId } from '../../src/lib/books.ts'
import type { VerseRange, VerseRef } from '../../src/lib/crossrefs.ts'

export const DATA_DIR = join(import.meta.dirname, '..', '..', 'public', 'data')

export interface Versification {
  exists: (target: VerseRange | VerseRef) => boolean
  /** The number of verses in a chapter, or 0 when there is no such chapter. */
  versesIn: (book: BookId, chapter: number) => number
}

export async function loadKjv(): Promise<{ info: BibleInfo } & Versification> {
  const info = JSON.parse(await readFile(join(DATA_DIR, 'bibles', 'kjv', 'index.json'), 'utf8')) as BibleInfo
  const counts = new Map(info.books.map((book) => [book.id, book.verses]))
  const versesIn = (book: BookId, chapter: number): number => counts.get(book)?.[chapter - 1] ?? 0
  const one = ({ book, chapter, verse }: VerseRef): boolean => verse <= versesIn(book, chapter)
  const exists = (target: VerseRange | VerseRef): boolean =>
    'start' in target ? one(target.start) && (!target.end || one(target.end)) : one(target)
  return { info, exists, versesIn }
}
