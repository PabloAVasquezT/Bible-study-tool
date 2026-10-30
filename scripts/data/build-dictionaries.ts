// Generates public/data/dictionaries/ from CrossWire's Easton module.
// Usage: npm run data:dictionaries (after npm run data:bibles, whose KJV verse counts it checks against)
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { entryFile, type DictionaryEntry, type DictionaryInfo } from '../../src/lib/articles.ts'
import { convertEastonEntry, type Stats } from './articles.ts'
import { loadSource } from './download.ts'
import { DATA_DIR, loadKjv } from './kjv.ts'
import { readZld, zldFilesFrom } from './sword.ts'
import { parseXml } from './xml.ts'
import { readZip } from './zip.ts'

const OUT_DIR = join(DATA_DIR, 'dictionaries')

/** Guards against the source silently losing or gaining entries. */
const EXPECTED_ENTRIES = 3963

const info: Omit<DictionaryInfo, 'entries'> = {
  id: 'easton',
  name: "Easton's Bible Dictionary",
  license: 'Public Domain',
  source: { name: 'CrossWire Bible Society (text from CCEL)', url: 'https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=Easton' },
  changes:
    'M. G. Easton’s Illustrated Bible Dictionary, 3rd edition (1897), without its illustrations. Converted from TEI to JSON. ' +
    'References written with numbers only are linked to the book and chapter of the reference before them, which fixes ' +
    'hundreds that the source linked to the wrong book; the few that cannot be resolved are plain text.'
}

const kjv = await loadKjv()
const stats: Stats = { unlinked: 0, repaired: 0 }
const entries: DictionaryEntry[] = readZld(zldFilesFrom(readZip(await loadSource('crosswire-easton')))).map(({ key, text }) =>
  convertEastonEntry(key, parseXml(text), kjv, stats)
)
if (entries.length !== EXPECTED_ENTRIES) throw new Error(`Expected ${EXPECTED_ENTRIES} entries, found ${entries.length}`)

// A few keys give the same id: "HAIL" and "HAIL!", and two different entries each for KADESH
// and SALMON. Later ones get a suffix ("hail-2"); links by name go to the first.
const ids = new Set<string>()
for (const entry of entries) {
  let id = entry.id
  for (let n = 2; ids.has(id); n++) id = `${entry.id}-${n}`
  entry.id = id
  ids.add(id)
}

// Links to entries that do not exist become plain text.
let brokenLinks = 0
for (const entry of entries) {
  for (const block of entry.blocks) {
    const lines = 'p' in block ? [block.p] : block.poem
    for (const line of lines) {
      line.forEach((inline, index) => {
        if (typeof inline === 'object' && 'entry' in inline && !ids.has(inline.entry)) {
          line[index] = inline.t
          brokenLinks++
        }
      })
    }
  }
}

await rm(OUT_DIR, { recursive: true, force: true })
const dir = join(OUT_DIR, info.id)
await mkdir(dir, { recursive: true })
const files = Map.groupBy(entries, (entry) => entryFile(entry.id))
for (const [file, fileEntries] of files) {
  // One entry per line, so that upstream changes produce readable diffs.
  const lines = fileEntries.map((entry) => `${JSON.stringify(entry.id)}:${JSON.stringify(entry)}`)
  await writeFile(join(dir, `${file}.json`), `{\n${lines.join(',\n')}\n}\n`)
}
// The titles let the app list and filter the entries without loading them.
const titles = entries.map((entry) => [entry.id, entry.title])
await writeFile(join(dir, 'titles.json'), `[\n${titles.map((title) => JSON.stringify(title)).join(',\n')}\n]\n`)
await writeFile(join(OUT_DIR, 'index.json'), JSON.stringify([{ ...info, entries: entries.length }], null, 2) + '\n')
console.log(`${info.id}: ${entries.length} entries in ${files.size} files; ${stats.repaired} references repaired, ${stats.unlinked} and ${brokenLinks} entry links left as text`)
