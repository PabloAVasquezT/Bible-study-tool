// Passages and their URLs: /kjv/jhn/3 for a chapter, /kjv/jhn/3/16 for a verse.
import type { BookInfo } from './bible.ts'
import { isBookId, type BookId } from './books.ts'

export interface Passage {
  bible: string
  book: BookId
  chapter: number
  verse?: number
}

export interface ChapterRef {
  book: BookId
  chapter: number
}

export function parsePassagePath(path: string): Passage | undefined {
  const parts = path.split('/').filter(Boolean)
  if (parts.length < 3 || parts.length > 4) return undefined
  const [bible = '', book = '', chapter = '', verse] = parts
  const id = book.toUpperCase()
  if (!/^[a-z0-9-]+$/.test(bible) || !isBookId(id)) return undefined
  const chapterNumber = positiveInteger(chapter)
  const verseNumber = verse === undefined ? undefined : positiveInteger(verse)
  if (chapterNumber === undefined || (verse !== undefined && verseNumber === undefined)) return undefined
  return { bible, book: id, chapter: chapterNumber, ...(verseNumber !== undefined && { verse: verseNumber }) }
}

export function passagePath({ bible, book, chapter, verse }: Passage): string {
  return `/${bible}/${book.toLowerCase()}/${chapter}${verse === undefined ? '' : `/${verse}`}`
}

/** The chapter before or after the given one, crossing book boundaries. */
export function adjacentChapter(books: BookInfo[], { book, chapter }: ChapterRef, step: 1 | -1): ChapterRef | undefined {
  const index = books.findIndex((info) => info.id === book)
  const current = books[index]
  if (!current) return undefined
  const next = chapter + step
  if (next >= 1 && next <= current.verses.length) return { book, chapter: next }
  const other = books[index + step]
  if (!other) return undefined
  return { book: other.id, chapter: step === 1 ? 1 : other.verses.length }
}

function positiveInteger(text: string): number | undefined {
  return /^[1-9]\d*$/.test(text) ? Number(text) : undefined
}
