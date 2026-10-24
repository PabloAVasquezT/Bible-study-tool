// Reads the OpenBible.info cross-references: a TSV of "From Verse", "To Verse" and
// "Votes", with OSIS-style book codes (Gen.1.1, Acts.14.15, Lev.27.34-Num.1.1).
import { BOOK_IDS, type BookId } from '../../src/lib/books.ts'
import { formatVerseRange, parseVerseRange, type VerseRange } from '../../src/lib/crossrefs.ts'

const OSIS_BOOKS = (
  'Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov ' +
  'Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal ' +
  'Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm ' +
  'Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev'
).split(' ')

const TO_USFM = new Map<string, BookId>(OSIS_BOOKS.map((code, index) => [code, BOOK_IDS[index]!]))

export interface CrossReference {
  from: VerseRange
  to: VerseRange
  votes: number
}

/** Converts "Gen.1.1" or "Lev.27.34-Num.1.1" to our "GEN.1.1" or "LEV.27.34-NUM.1.1". */
export function convertOsisRange(osis: string, fixes: Record<string, string> = {}): VerseRange {
  const usfm = osis
    .split('-')
    .map((part) => {
      const fixed = fixes[part] ?? part
      const [book = '', ...rest] = fixed.split('.')
      const id = TO_USFM.get(book)
      if (!id) throw new Error(`Unknown OSIS book "${book}" in ${osis}`)
      return [id, ...rest].join('.')
    })
    .join('-')
  const range = parseVerseRange(usfm)
  if (!range) throw new Error(`Malformed reference "${osis}"`)
  return range
}

/** Parses the TSV. `fixes` maps verses that do not exist in our versification to ones that do. */
export function parseOpenBible(tsv: string, fixes: Record<string, string> = {}): CrossReference[] {
  const [header = '', ...lines] = tsv.split('\n')
  if (!header.startsWith('From Verse\tTo Verse\tVotes')) throw new Error(`Unexpected header: ${header}`)
  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const [from = '', to = '', votes = '', extra] = line.split('\t')
      if (extra !== undefined || !/^-?\d+$/.test(votes)) throw new Error(`Malformed line: ${line}`)
      return { from: convertOsisRange(from, fixes), to: convertOsisRange(to, fixes), votes: Number(votes) }
    })
}

/**
 * Groups references by source verse, best voted first, dropping those the community voted
 * down or not at all, and any that became duplicates or self-references after the fixes.
 */
export function groupByVerse(references: CrossReference[]): Map<string, string[]> {
  const sorted = references.filter((ref) => ref.votes > 0).sort((a, b) => b.votes - a.votes)
  const grouped = new Map<string, string[]>()
  for (const { from, to } of sorted) {
    const source = formatVerseRange(from)
    const target = formatVerseRange(to)
    if (source === target) continue
    const targets = grouped.get(source) ?? []
    if (!targets.includes(target)) targets.push(target)
    grouped.set(source, targets)
  }
  return grouped
}
