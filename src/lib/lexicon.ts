// Shape of the generated lexicon data in public/data/lexicons/. See docs/data-format.md.

/** Rich text in a lexicon entry. */
export type LexiconInline =
  | string
  /** A reference to another entry, e.g. "G25". */
  | { ref: string }
  /** A Greek or Hebrew word quoted in the text. */
  | { word: string; lang: string; translit?: string }
  /** One of the core meanings, which Strong's Hebrew dictionary marks out. */
  | { def: string }

export interface LexiconEntry {
  id: string
  lemma: string
  /** BCP 47 language of the lemma: "grc", "he" or "arc". */
  lang: string
  translit?: string
  pronunciation?: string
  /** Part of speech code from the source, e.g. "n-m". */
  partOfSpeech?: string
  derivation?: LexiconInline[]
  definition?: LexiconInline[]
  /** How the King James Version translates the word. */
  usage?: LexiconInline[]
  note?: LexiconInline[]
}

export interface LexiconInfo {
  id: string
  name: string
  /** The letter of the Strong's numbers it covers: "G" or "H". */
  prefix: string
  license: string
  licenseUrl?: string
  /** Who to credit, when the license asks for it. */
  attribution?: string
  source: { name: string; url: string }
  changes: string
  entries: number
  /** Entry n is in the file Math.floor(n / chunkSize).json. */
  chunkSize: number
}

/** The chunk file that holds a Strong's number, e.g. "G2424" → { prefix: "G", chunk: 24 }. */
export function strongsLocation(strong: string, chunkSize: number): { prefix: string; number: number; chunk: number } | undefined {
  const match = /^([GH])(\d+)$/.exec(strong)
  if (!match) return undefined
  const number = Number(match[2])
  return { prefix: match[1]!, number, chunk: Math.floor(number / chunkSize) }
}
