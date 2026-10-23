import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { sources, type SourceId } from './sources.ts'

const CACHE_DIR = join(import.meta.dirname, '..', '..', '.cache', 'sources')

function sha256(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex')
}

/** Returns the bytes of a pinned source, downloading it into .cache/ on first use. */
export async function loadSource(id: SourceId): Promise<Uint8Array> {
  const { url, sha256: expected } = sources[id]
  const path = join(CACHE_DIR, basename(new URL(url).pathname))

  let data: Uint8Array
  if (existsSync(path)) {
    data = await readFile(path)
  } else {
    console.log(`Downloading ${url}`)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Download failed: ${url} (${response.status})`)
    data = new Uint8Array(await response.arrayBuffer())
    await mkdir(CACHE_DIR, { recursive: true })
    await writeFile(path, data)
  }

  const actual = sha256(data)
  if (actual !== expected) {
    throw new Error(
      `Checksum mismatch for ${id} (${path}).\n  expected ${expected}\n  actual   ${actual}\n` +
        'The upstream file changed: review it, then update the hash in scripts/data/sources.ts.'
    )
  }
  return data
}
