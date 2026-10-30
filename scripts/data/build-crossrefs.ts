// Generates public/data/crossrefs/ from the OpenBible.info cross-references.
// Usage: npm run data:crossrefs (after npm run data:bibles, whose KJV verse counts it checks against)
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseVerseRange, type CrossReferenceFile, type CrossReferenceInfo } from '../../src/lib/crossrefs.ts'
import { groupByVerse, parseOpenBible } from './crossrefs.ts'
import { loadSource } from './download.ts'
import { DATA_DIR, loadKjv } from './kjv.ts'
import { readZip } from './zip.ts'

const OUT_DIR = join(DATA_DIR, 'crossrefs')

// OpenBible follows the ESV, which splits the KJV's 3 John 1:14 into verses 14 and 15.
const VERSIFICATION_FIXES = { '3John.1.15': '3John.1.14' }

/** Guards against the source silently losing or gaining references. */
const EXPECTED_REFERENCES = 341_291

const info: Omit<CrossReferenceInfo, 'references'> = {
  name: 'Cross References',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  attribution: 'OpenBible.info',
  source: { name: 'OpenBible.info Cross References', url: 'https://www.openbible.info/labs/cross-references/' },
  changes:
    'Converted to JSON and sorted by votes. References voted down or not voted on are omitted, and 3 John 1:15 is mapped to the KJV’s 3 John 1:14.'
}

const { info: kjv, exists } = await loadKjv()

const archive = readZip(await loadSource('openbible-crossrefs'))
const tsv = archive.get('cross_references.txt')
if (!tsv) throw new Error(`cross_references.txt not found in the archive: ${[...archive.keys()].join(', ')}`)
const grouped = groupByVerse(parseOpenBible(new TextDecoder('utf-8', { fatal: true }).decode(tsv), VERSIFICATION_FIXES))

// Lay the references out in the KJV's chapter and verse slots, one file per book.
const files = new Map<string, CrossReferenceFile>(
  kjv.books.map((book) => [book.id, { id: book.id, chapters: book.verses.map((count) => Array.from({ length: count }, () => [])) }])
)
let total = 0
for (const [source, targets] of grouped) {
  const { start } = parseVerseRange(source)!
  for (const target of targets) {
    if (!exists(parseVerseRange(target)!)) throw new Error(`${source} → ${target}: no such verse in the KJV`)
  }
  if (!exists(start)) throw new Error(`${source}: no such verse in the KJV`)
  files.get(start.book)!.chapters[start.chapter - 1]![start.verse - 1] = targets
  total += targets.length
}
if (total !== EXPECTED_REFERENCES) throw new Error(`Expected ${EXPECTED_REFERENCES} references, found ${total}`)

/** One verse per line, so that upstream changes produce readable diffs. */
function formatFile({ id, chapters }: CrossReferenceFile): string {
  const body = chapters.map((verses) => `[\n${verses.map((targets) => JSON.stringify(targets)).join(',\n')}\n]`)
  return `{"id":${JSON.stringify(id)},"chapters":[\n${body.join(',\n')}\n]}\n`
}

await rm(OUT_DIR, { recursive: true, force: true })
await mkdir(OUT_DIR, { recursive: true })
for (const file of files.values()) await writeFile(join(OUT_DIR, `${file.id}.json`), formatFile(file))
await writeFile(join(OUT_DIR, 'index.json'), JSON.stringify({ ...info, references: total }, null, 2) + '\n')
console.log(`crossrefs: ${total} references from ${grouped.size} verses`)
