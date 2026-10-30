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

/** The search page of a Bible, e.g. /kjv/search?q=love. */
export function searchPath(bible: string, query = ''): string {
  const q = query.trim()
  return `/${bible}/search${q ? `?q=${encodeURIComponent(q)}` : ''}`
}

/** Recognizes /kjv/search and returns the Bible's id. */
export function parseSearchPath(path: string): string | undefined {
  return /^\/([a-z0-9-]+)\/search\/?$/.exec(path)?.[1]
}

/** /dictionary/easton for the list of entries, /dictionary/easton/aaron for one. */
export function dictionaryPath(dictionary: string, entry?: string): string {
  return `/dictionary/${dictionary}${entry ? `/${entry}` : ''}`
}

export function parseDictionaryPath(path: string): { dictionary: string; entry?: string } | undefined {
  const match = /^\/dictionary\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?\/?$/.exec(path)
  if (!match) return undefined
  return { dictionary: match[1]!, ...(match[2] && { entry: match[2] }) }
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
