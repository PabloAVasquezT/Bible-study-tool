// Generates the search indexes in public/data/search/ from the generated Bibles.
// Usage: npm run data:search (after npm run data:bibles)
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { plainText, type BibleInfo, type BibleSummary, type BookFile, type Inline } from '../../src/lib/bible.ts'
import { encodePostings, strongsFile, wordFile, wordsOf } from '../../src/lib/search.ts'

const DATA_DIR = join(import.meta.dirname, '..', '..', 'public', 'data')
const OUT_DIR = join(DATA_DIR, 'search')

const readJson = async <T>(path: string): Promise<T> => JSON.parse(await readFile(join(DATA_DIR, path), 'utf8')) as T

/** Strong's numbers tagged anywhere in a verse, notes excluded. */
function strongsOf(inlines: Inline[]): string[] {
  return inlines.flatMap((inline) => (typeof inline === 'object' && 't' in inline && inline.s ? inline.s.split(' ') : []))
}

function add(index: Map<string, number[]>, key: string, verse: number): void {
  const postings = index.get(key)
  if (!postings) index.set(key, [verse])
  // Verses are visited in order, so a repeat can only be the last entry.
  else if (postings.at(-1) !== verse) postings.push(verse)
}

/** Groups keys into files, one key per line, sorted for stable diffs. */
async function writeFiles(dir: string, index: Map<string, number[]>, fileOf: (key: string) => string): Promise<string[]> {
  const files = new Map<string, string[]>()
  for (const key of [...index.keys()].sort()) files.set(fileOf(key), [...(files.get(fileOf(key)) ?? []), key])
  await mkdir(dir, { recursive: true })
  for (const [file, keys] of files) {
    const lines = keys.map((key) => `${JSON.stringify(key)}:${JSON.stringify(encodePostings(index.get(key)!))}`)
    await writeFile(join(dir, `${file}.json`), `{\n${lines.join(',\n')}\n}\n`)
  }
  return [...files.keys()].sort()
}

await rm(OUT_DIR, { recursive: true, force: true })
for (const { id } of await readJson<BibleSummary[]>('bibles/index.json')) {
  const info = await readJson<BibleInfo>(`bibles/${id}/index.json`)
  const words = new Map<string, number[]>()
  const strongs = new Map<string, number[]>()
  let verse = 0
  for (const book of info.books) {
    const { chapters } = await readJson<BookFile>(`bibles/${id}/${book.id}.json`)
    for (const chapter of chapters) {
      for (const { text } of chapter.verses) {
        for (const word of wordsOf(plainText(text))) add(words, word, verse)
        for (const strong of strongsOf(text)) add(strongs, strong, verse)
        verse++
      }
    }
  }

  const dir = join(OUT_DIR, id)
  const wordFiles = await writeFiles(join(dir, 'words'), words, wordFile)
  const strongsFiles = await writeFiles(join(dir, 'strongs'), strongs, strongsFile)
  await writeFile(join(dir, 'index.json'), JSON.stringify({ verses: verse, words: words.size, strongs: strongs.size, wordFiles, strongsFiles }, null, 2) + '\n')
  console.log(`${id}: ${verse} verses, ${words.size} words, ${strongs.size} Strong's numbers`)
}
