// Shape of the generated cross-reference data in public/data/crossrefs/. See docs/data-format.md.
import { isBookId, type BookId } from './books.ts'

export interface CrossReferenceInfo {
  name: string
  license: string
  licenseUrl: string
  attribution: string
  source: { name: string; url: string }
  changes: string
  references: number
}

/** References for one book: chapters[c - 1][v - 1] lists the targets of verse c:v, best first. */
export interface CrossReferenceFile {
  id: BookId
  chapters: string[][][]
}

export interface VerseRef {
  book: BookId
  chapter: number
  verse: number
}

export interface VerseRange {
  start: VerseRef
  end?: VerseRef
}

/** Formats a target such as "JHN.3.16" or "LEV.27.34-NUM.1.1". */
export function formatVerseRange({ start, end }: VerseRange): string {
  const one = ({ book, chapter, verse }: VerseRef): string => `${book}.${chapter}.${verse}`
  return end ? `${one(start)}-${one(end)}` : one(start)
}

export function parseVerseRange(text: string): VerseRange | undefined {
  const [first = '', second, extra] = text.split('-')
  if (extra !== undefined) return undefined
  const start = parseVerseRef(first)
  const end = second === undefined ? undefined : parseVerseRef(second)
  if (!start || (second !== undefined && !end)) return undefined
  return end ? { start, end } : { start }
}

/** A label such as "Romans 5:8", "1 John 4:9–10", "Psalms 119:176–120:2" or "Leviticus 27:34 – Numbers 1:1". */
export function rangeLabel({ start, end }: VerseRange, bookName: (book: BookId) => string): string {
  const head = `${bookName(start.book)} ${start.chapter}:${start.verse}`
  if (!end) return head
  if (end.book !== start.book) return `${head} – ${bookName(end.book)} ${end.chapter}:${end.verse}`
  if (end.chapter !== start.chapter) return `${head}–${end.chapter}:${end.verse}`
  return `${head}–${end.verse}`
}

function parseVerseRef(text: string): VerseRef | undefined {
  const match = /^([1-3]?[A-Z]{2,3})\.([1-9]\d*)\.([1-9]\d*)$/.exec(text)
  if (!match || !isBookId(match[1]!)) return undefined
  return { book: match[1] as BookId, chapter: Number(match[2]), verse: Number(match[3]) }
}
