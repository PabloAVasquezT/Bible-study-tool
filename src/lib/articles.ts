// Shape of the generated dictionaries and devotionals, which share one rich-text format.
// See docs/data-format.md.

/** A run of text: plain ("\n" is a line break), styled, or a link. */
export type ArticleInline =
  | string
  | { t: string; style: 'italic' | 'smallCaps' }
  /** A Bible reference such as "JOS.5.12" or "EXO.4.27-EXO.4.30". */
  | { t: string; ref: string }
  /** A link to another entry of the same dictionary. */
  | { t: string; entry: string }

export type ArticleBlock = { p: ArticleInline[] } | { poem: ArticleInline[][] }

interface SourceInfo {
  id: string
  name: string
  license: string
  source: { name: string; url: string }
  changes: string
}

export interface DictionaryInfo extends SourceInfo {
  entries: number
}

export interface DictionaryEntry {
  id: string
  title: string
  blocks: ArticleBlock[]
}

export interface DevotionalInfo extends SourceInfo {
  author: string
}

export type DevotionalTime = 'morning' | 'evening'

/** A reading by its day and time, e.g. ["10.28", "morning"]. */
export type DevotionalReadingRef = [day: string, time: DevotionalTime]

/** Verse ("JHN.15.19") → the readings about it. */
export type DevotionalPassages = Record<string, DevotionalReadingRef[]>

export interface DevotionalReading {
  title: string
  blocks: ArticleBlock[]
}

/** One day, with id "MM.DD"; February 29 is included. */
export interface DevotionalDay {
  id: string
  morning: DevotionalReading
  evening: DevotionalReading
}

/** The id of a dictionary entry in URLs and files: "ZUPH, LAND OF" → "zuph-land-of". */
export function entrySlug(key: string): string {
  return key
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** The file that holds an entry: its first letter, or "_" for anything else. */
export function entryFile(slug: string): string {
  const first = slug[0] ?? ''
  return first >= 'a' && first <= 'z' ? first : '_'
}
