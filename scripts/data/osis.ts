// OSIS book codes (Gen, Exod, 1John…), as used by OpenBible.info and SWORD modules.
import { BOOK_IDS, type BookId } from '../../src/lib/books.ts'
import { parseVerseRange, type VerseRange } from '../../src/lib/crossrefs.ts'

const OSIS_BOOKS = (
  'Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov ' +
  'Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal ' +
  'Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm ' +
  'Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev'
).split(' ')

const TO_USFM = new Map<string, BookId>(OSIS_BOOKS.map((code, index) => [code, BOOK_IDS[index]!]))

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
