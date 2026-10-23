// Generates public/data/bibles/ from the pinned upstream sources.
// Usage: npm run data:bibles
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { BibleInfo, BibleSummary, BookFile } from '../../src/lib/bible.ts'
import { BOOK_IDS } from '../../src/lib/books.ts'
import { loadSource } from './download.ts'
import type { SourceId } from './sources.ts'
import { parseUsfm } from './usfm.ts'
import { readZip } from './zip.ts'

const OUT_DIR = join(import.meta.dirname, '..', '..', 'public', 'data', 'bibles')

interface BibleConfig extends Omit<BibleInfo, 'books'> {
  sourceId: SourceId
  /** Guards against a source silently losing or gaining verses. */
  expectedVerses: number
}

const bibles: BibleConfig[] = [
  {
    id: 'kjv',
    name: 'King James Version',
    abbreviation: 'KJV',
    language: 'en',
    license: 'Public Domain',
    source: { name: 'eBible.org', url: 'https://ebible.org/find/details.php?id=eng-kjv2006' },
    sourceId: 'eng-kjv2006',
    expectedVerses: 31102
  }
]

async function buildBible({ sourceId, expectedVerses, ...summary }: BibleConfig): Promise<BibleSummary> {
  const archive = readZip(await loadSource(sourceId))
  const decoder = new TextDecoder('utf-8', { fatal: true })
  const books = [...archive]
    .filter(([name]) => name.endsWith('.usfm'))
    .map(([, data]) => parseUsfm(decoder.decode(data)))
    .sort((a, b) => BOOK_IDS.indexOf(a.id) - BOOK_IDS.indexOf(b.id))

  const ids = books.map((book) => book.id).join(' ')
  if (ids !== BOOK_IDS.join(' ')) throw new Error(`${summary.id}: unexpected books: ${ids}`)
  const verses = books.flatMap((book) => book.chapters.flatMap((chapter) => chapter.verses))
  if (verses.length !== expectedVerses) {
    throw new Error(`${summary.id}: expected ${expectedVerses} verses, found ${verses.length}`)
  }
  const empty = verses.filter((verse) => verse.text.length === 0).length
  if (empty) console.warn(`${summary.id}: ${empty} empty verses`)

  const dir = join(OUT_DIR, summary.id)
  await rm(dir, { recursive: true, force: true })
  await mkdir(dir, { recursive: true })
  for (const { id, chapters } of books) {
    await writeFile(join(dir, `${id}.json`), formatBook({ id, chapters }))
  }

  const info: BibleInfo = {
    ...summary,
    books: books.map(({ id, name, abbreviation, title, chapters }) => ({
      id,
      name,
      abbreviation,
      title,
      verses: chapters.map((chapter) => chapter.verses.length)
    }))
  }
  await writeFile(join(dir, 'index.json'), JSON.stringify(info, null, 2) + '\n')
  console.log(`${summary.id}: ${books.length} books, ${verses.length} verses`)
  return { id: summary.id, name: summary.name, abbreviation: summary.abbreviation, language: summary.language }
}

/** One verse per line, so that upstream changes produce readable diffs. */
function formatBook(book: BookFile): string {
  const chapters = book.chapters.map(({ verses, ...rest }) => {
    const fields = JSON.stringify(rest).slice(1, -1)
    return `{${fields ? fields + ',' : ''}"verses":[\n${verses.map((verse) => JSON.stringify(verse)).join(',\n')}\n]}`
  })
  return `{"id":${JSON.stringify(book.id)},"chapters":[\n${chapters.join(',\n')}\n]}\n`
}

const summaries: BibleSummary[] = []
for (const config of bibles) summaries.push(await buildBible(config))
await writeFile(join(OUT_DIR, 'index.json'), JSON.stringify(summaries, null, 2) + '\n')
