// Full-text search over a prebuilt index. Shared by the index builder and the app, so
// both normalize words in exactly the same way. See docs/data-format.md.
import type { BookInfo } from './bible.ts'
import type { BookId } from './books.ts'

/** Strong's numbers per search index file: G2400–G2899 are in "G4" when this is 500. */
export const STRONGS_PER_FILE = 500

/**
 * Lowercase without accents or ligatures, so "Dios" finds "dios", "crio" finds "crió" and
 * "aeneas" finds "Æneas". Keeps ñ, as "año" is not "ano".
 */
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .replace(/ñ/g, '\u0000')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\u0000/g, 'ñ')
}

const WORD = /\p{L}[\p{L}\p{M}]*/gu

/** The normalized words of a text, in order. */
export function wordsOf(text: string): string[] {
  return [...text.matchAll(WORD)].map((match) => normalizeWord(match[0]))
}

/** Splits text into words and the text between them, keeping everything. */
export function splitWords(text: string): { text: string; word?: string }[] {
  const parts: { text: string; word?: string }[] = []
  let last = 0
  for (const match of text.matchAll(WORD)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) })
    parts.push({ text: match[0], word: normalizeWord(match[0]) })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}

/** The index file that holds a normalized word: its first letter, or "_" for anything else. */
export function wordFile(word: string): string {
  const first = word[0] ?? ''
  return first >= 'a' && first <= 'z' ? first : '_'
}

/** The index file that holds a Strong's number, e.g. "G2424" → "G4". */
export function strongsFile(strong: string): string {
  return `${strong[0]}${Math.floor(Number(strong.slice(1)) / STRONGS_PER_FILE)}`
}

export type SearchTerm = { kind: 'word' | 'prefix'; value: string } | { kind: 'strong'; value: string }

/** "love G26 believ*" → a word, a Strong's number and a prefix. */
export function parseQuery(query: string): SearchTerm[] {
  const terms: SearchTerm[] = []
  const add = (term: SearchTerm): void => {
    if (!terms.some((other) => other.kind === term.kind && other.value === term.value)) terms.push(term)
  }
  for (const token of query.trim().split(/\s+/).filter(Boolean)) {
    const strong = /^([GHgh])0*(\d+)$/.exec(token)
    if (strong) {
      add({ kind: 'strong', value: `${strong[1]!.toUpperCase()}${strong[2]}` })
    } else if (token.endsWith('*')) {
      const [prefix] = wordsOf(token.slice(0, -1))
      if (prefix) add({ kind: 'prefix', value: prefix })
    } else {
      for (const word of wordsOf(token)) add({ kind: 'word', value: word })
    }
  }
  return terms
}

/** Whether a normalized word matches any of the word and prefix terms. */
export function matchesWord(word: string, terms: SearchTerm[]): boolean {
  return terms.some((term) => (term.kind === 'word' && term.value === word) || (term.kind === 'prefix' && word.startsWith(term.value)))
}

/** Sorted verse numbers are stored as differences from the previous one, which are small. */
export function encodePostings(sorted: number[]): number[] {
  return sorted.map((value, index) => value - (sorted[index - 1] ?? 0))
}

export function decodePostings(deltas: number[]): number[] {
  let value = 0
  return deltas.map((delta) => (value += delta))
}

/** Verses in both sorted lists. */
export function intersect(a: number[], b: number[]): number[] {
  const result: number[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i]! < b[j]!) i++
    else if (a[i]! > b[j]!) j++
    else {
      result.push(a[i]!)
      i++
      j++
    }
  }
  return result
}

/** Verses in any of the sorted lists, sorted and without repeats. */
export function union(lists: number[][]): number[] {
  return [...new Set(lists.flat())].sort((a, b) => a - b)
}

export interface VerseLocation {
  book: BookId
  chapter: number
  verse: number
}

/**
 * Verses are numbered 0, 1, 2… across the whole Bible in the KJV's slots, which every
 * Bible shares. This converts between those numbers and book, chapter and verse.
 */
export function verseLocator(books: BookInfo[]): { locate: (index: number) => VerseLocation; total: number } {
  const chapters: { book: BookId; chapter: number; start: number }[] = []
  let total = 0
  for (const book of books) {
    book.verses.forEach((count, index) => {
      chapters.push({ book: book.id, chapter: index + 1, start: total })
      total += count
    })
  }
  const locate = (index: number): VerseLocation => {
    if (index < 0 || index >= total) throw new RangeError(`No verse ${index}`)
    let low = 0
    let high = chapters.length - 1
    while (low < high) {
      const middle = Math.ceil((low + high) / 2)
      if (chapters[middle]!.start <= index) low = middle
      else high = middle - 1
    }
    const { book, chapter, start } = chapters[low]!
    return { book, chapter, verse: index - start + 1 }
  }
  return { locate, total }
}
