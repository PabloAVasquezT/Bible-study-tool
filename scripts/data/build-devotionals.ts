// Generates public/data/devotionals/ from CrossWire's SME module (Spurgeon's Morning and Evening).
// Usage: npm run data:devotionals (after npm run data:bibles, whose KJV verse counts it checks against)
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { DevotionalInfo, DevotionalPassages } from '../../src/lib/articles.ts'
import { convertDevotionalDay, keyPassage, type Stats } from './articles.ts'
import { loadSource } from './download.ts'
import { DATA_DIR, loadKjv } from './kjv.ts'
import { readZld, zldFilesFrom } from './sword.ts'
import { parseXml } from './xml.ts'
import { readZip } from './zip.ts'

const OUT_DIR = join(DATA_DIR, 'devotionals')

const info: DevotionalInfo = {
  id: 'spurgeon',
  name: 'Morning and Evening',
  author: 'C. H. Spurgeon',
  license: 'Public Domain',
  source: { name: 'CrossWire Bible Society (text from CCEL)', url: 'https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=SME' },
  changes: 'Converted from OSIS to JSON.'
}

const kjv = await loadKjv()
const stats: Stats = { unlinked: 0, repaired: 0 }
const days = readZld(zldFilesFrom(readZip(await loadSource('crosswire-sme')))).map(({ key, text }) =>
  convertDevotionalDay(key, parseXml(text), kjv, stats)
)

// Every day of a leap year, in order.
const expected = Array.from({ length: 366 }, (_, i) => new Date(Date.UTC(2024, 0, 1 + i)))
  .map((date) => `${String(date.getUTCMonth() + 1).padStart(2, '0')}.${String(date.getUTCDate()).padStart(2, '0')}`)
if (days.map((day) => day.id).join(' ') !== expected.join(' ')) throw new Error('The devotional does not have exactly one entry per day')

// Each reading opens with the verse it is about, so the reader can show it with that verse.
const passages: DevotionalPassages = {}
for (const day of days) {
  for (const time of ['morning', 'evening'] as const) {
    const passage = keyPassage(day[time])
    if (!passage) throw new Error(`${day.id} ${time}: the reading has no key passage`)
    if (passage.includes('-')) throw new Error(`${day.id} ${time}: expected one verse, found ${passage}`)
    ;(passages[passage] ??= []).push([day.id, time])
  }
}

await rm(OUT_DIR, { recursive: true, force: true })
const dir = join(OUT_DIR, info.id)
await mkdir(dir, { recursive: true })
const months = Map.groupBy(days, (day) => day.id.slice(0, 2))
for (const [month, monthDays] of months) {
  // One day per line, so that upstream changes produce readable diffs.
  const lines = monthDays.map((day) => `${JSON.stringify(day.id)}:${JSON.stringify(day)}`)
  await writeFile(join(dir, `${month}.json`), `{\n${lines.join(',\n')}\n}\n`)
}
const passageLines = Object.keys(passages)
  .sort()
  .map((passage) => `${JSON.stringify(passage)}:${JSON.stringify(passages[passage])}`)
await writeFile(join(dir, 'passages.json'), `{\n${passageLines.join(',\n')}\n}\n`)
await writeFile(join(OUT_DIR, 'index.json'), JSON.stringify([info], null, 2) + '\n')
console.log(
  `${info.id}: ${days.length} days in ${months.size} files, about ${passageLines.length} verses; ${stats.unlinked} references left as text`
)
