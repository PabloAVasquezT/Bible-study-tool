// Reads the OpenBible.info cross-references: a TSV of "From Verse", "To Verse" and
// "Votes", with OSIS-style book codes (Gen.1.1, Acts.14.15, Lev.27.34-Num.1.1).
import { formatVerseRange, type VerseRange } from '../../src/lib/crossrefs.ts'
import { convertOsisRange } from './osis.ts'

export interface CrossReference {
  from: VerseRange
  to: VerseRange
  votes: number
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
