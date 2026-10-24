// Generates public/data/lexicons/ from the pinned upstream sources.
// Usage: npm run data:lexicons
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { LexiconEntry, LexiconInfo, LexiconInline } from '../../src/lib/lexicon.ts'
import { loadSource } from './download.ts'
import { convertGreekEntry, convertHebrewEntry } from './lexicons.ts'
import type { SourceId } from './sources.ts'
import { childElements, parseXml, type XmlElement } from './xml.ts'

const OUT_DIR = join(import.meta.dirname, '..', '..', 'public', 'data', 'lexicons')
const CHUNK_SIZE = 100

interface LexiconConfig {
  info: Omit<LexiconInfo, 'entries' | 'chunkSize'>
  sourceId: SourceId
  /** Guards against a source silently losing or gaining entries. */
  expectedEntries: number
  convert: (root: XmlElement) => LexiconEntry[]
}

const lexicons: LexiconConfig[] = [
  {
    info: {
      id: 'strongs-greek',
      name: "Strong's Greek Dictionary",
      prefix: 'G',
      license: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: { name: 'Ulrik Sandborg-Petersen, Strong’s Greek Dictionary in XML', url: 'https://github.com/morphgnt/strongs-dictionary-xml' },
      changes: 'Converted from XML to JSON. The numbers Strong left unused are omitted.'
    },
    sourceId: 'strongs-greek',
    // 5,624 numbers, of which G2717 and G3203–G3302 are unused.
    expectedEntries: 5523,
    convert: (root) =>
      childElements(childElements(root, 'entries')[0]!, 'entry')
        .map(convertGreekEntry)
        .filter((entry) => entry !== undefined)
  },
  {
    info: {
      id: 'strongs-hebrew',
      name: "Strong's Hebrew Dictionary",
      prefix: 'H',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      attribution: 'Open Scriptures Hebrew Bible Project',
      source: { name: 'Open Scriptures Hebrew Lexicon', url: 'https://github.com/openscriptures/HebrewLexicon' },
      changes: 'Converted from XML to JSON. The editors’ notes on their corrections are omitted.'
    },
    sourceId: 'strongs-hebrew',
    expectedEntries: 8674,
    convert: (root) => childElements(root, 'entry').map(convertHebrewEntry)
  }
]

function refsOf(entry: LexiconEntry): string[] {
  const fields: (LexiconInline[] | undefined)[] = [entry.derivation, entry.definition, entry.usage, entry.note]
  return fields.flatMap((field) => (field ?? []).flatMap((inline) => (typeof inline === 'object' && 'ref' in inline ? [inline.ref] : [])))
}

/** One entry per line, so that upstream changes produce readable diffs. */
function formatChunk(entries: LexiconEntry[]): string {
  return `{\n${entries.map((entry) => `${JSON.stringify(entry.id)}:${JSON.stringify(entry)}`).join(',\n')}\n}\n`
}

const decoder = new TextDecoder('utf-8', { fatal: true })
const converted = new Map<LexiconConfig, LexiconEntry[]>()
for (const config of lexicons) {
  const entries = config.convert(parseXml(decoder.decode(await loadSource(config.sourceId))))
  if (entries.length !== config.expectedEntries) {
    throw new Error(`${config.info.id}: expected ${config.expectedEntries} entries, found ${entries.length}`)
  }
  converted.set(config, entries)
}

// Every cross-reference must point to an entry that exists, in either lexicon.
const ids = new Set([...converted.values()].flat().map((entry) => entry.id))
const dangling = [...converted.values()].flat().flatMap((entry) => refsOf(entry).filter((ref) => !ids.has(ref)).map((ref) => `${entry.id} → ${ref}`))
if (dangling.length) throw new Error(`References to missing entries: ${dangling.slice(0, 10).join(', ')}`)

const infos: LexiconInfo[] = []
for (const [config, entries] of converted) {
  const dir = join(OUT_DIR, config.info.id)
  await rm(dir, { recursive: true, force: true })
  await mkdir(dir, { recursive: true })
  const chunks = Map.groupBy(entries, (entry) => Math.floor(Number(entry.id.slice(1)) / CHUNK_SIZE))
  for (const [chunk, chunkEntries] of chunks) await writeFile(join(dir, `${chunk}.json`), formatChunk(chunkEntries))
  infos.push({ ...config.info, entries: entries.length, chunkSize: CHUNK_SIZE })
  console.log(`${config.info.id}: ${entries.length} entries in ${chunks.size} files`)
}
await writeFile(join(OUT_DIR, 'index.json'), JSON.stringify(infos, null, 2) + '\n')
