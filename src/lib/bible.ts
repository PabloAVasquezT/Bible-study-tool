// Shape of the generated Bible data in public/data/bibles/. See docs/data-format.md.
import type { BookId } from './books.ts'

export const InlineFlag = {
  /** Words supplied by the translators, traditionally printed in italics. */
  added: 1,
  /** The divine name (LORD, GOD), traditionally printed in small capitals. */
  divineName: 2,
  /** Words of Jesus, traditionally printed in red. */
  wordsOfJesus: 4
} as const

/** A run of text with Strong's numbers and/or style flags. */
export interface Word {
  t: string
  /** One or more Strong's numbers separated by spaces, e.g. "H430" or "G2424 G5547". */
  s?: string
  f?: number
}

/** A translator's or marginal note, anchored where it appears in the text. */
export interface Note {
  note: Inline[]
}

/** Plain text is stored as a bare string to keep the files small. */
export type Inline = string | Word | Note

/** The text of some inlines without notes or markup, e.g. for a preview. */
export function plainText(inlines: Inline[]): string {
  return inlines
    .map((inline) => (typeof inline === 'string' ? inline : 'note' in inline ? '' : inline.t))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

/** How a verse starts: a new paragraph, a new poetry line, or a new stanza. */
export type VerseBreak = 'paragraph' | 'line' | 'stanza'

export interface Verse {
  break?: VerseBreak
  heading?: Inline[]
  text: Inline[]
}

export interface Chapter {
  /** Psalm superscriptions, which precede verse 1. */
  title?: Inline[]
  /** Text after the last verse, such as the subscriptions of Paul's epistles. */
  subscription?: Inline[]
  verses: Verse[]
}

export interface BookFile {
  id: BookId
  chapters: Chapter[]
}

export interface BookInfo {
  id: BookId
  name: string
  abbreviation: string
  title: string
  /** Number of verses in each chapter. */
  verses: number[]
}

export interface BibleSummary {
  id: string
  name: string
  abbreviation: string
  language: string
}

export interface BibleInfo extends BibleSummary {
  license: string
  source: { name: string; url: string }
  books: BookInfo[]
}
