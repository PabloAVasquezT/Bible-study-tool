// Reader for SWORD dictionaries and devotionals stored with the zLD driver
// (https://wiki.crosswire.org/DevTools:Modules). A module is four files:
//   .idx  per key: [offset u32][size u32] into .dat
//   .dat  the key, "\n", then [block u32][entry u32]
//   .zdx  per block: [offset u32][size u32] into .zdt
//   .zdt  zlib-compressed blocks; inflated, a block is [count u32], then count × [offset u32][size u32]
//         relative to the block, then the entries' text
// All numbers are little-endian.
import { inflateSync } from 'node:zlib'

export interface ZldFiles {
  idx: Uint8Array
  dat: Uint8Array
  zdx: Uint8Array
  zdt: Uint8Array
}

export interface ZldEntry {
  key: string
  text: string
}

const view = (data: Uint8Array): DataView => new DataView(data.buffer, data.byteOffset, data.byteLength)

/** Finds the four zLD files in a module's ZIP archive, as read by readZip. */
export function zldFilesFrom(archive: Map<string, Uint8Array>): ZldFiles {
  // Modules can hold other files (Easton has an empty dict.dat), so go by the index's name.
  const indexes = [...archive.keys()].filter((name) => name.startsWith('modules/') && name.endsWith('.idx'))
  if (indexes.length !== 1) throw new Error(`Expected one .idx file in the module, found ${indexes.length}`)
  const base = indexes[0]!.slice(0, -'.idx'.length)
  const file = (extension: string): Uint8Array => {
    const data = archive.get(`${base}.${extension}`)
    if (!data) throw new Error(`Missing ${base}.${extension} in the module`)
    return data
  }
  return { idx: file('idx'), dat: file('dat'), zdx: file('zdx'), zdt: file('zdt') }
}

export function readZld({ idx, dat, zdx, zdt }: ZldFiles): ZldEntry[] {
  const index = view(idx)
  const blockIndex = view(zdx)
  const decoder = new TextDecoder('utf-8', { fatal: true })
  const blocks = new Map<number, Uint8Array>()
  const block = (number: number): Uint8Array => {
    let data = blocks.get(number)
    if (!data) {
      if ((number + 1) * 8 > zdx.length) throw new Error(`zLD block ${number} is out of range`)
      const offset = blockIndex.getUint32(number * 8, true)
      data = inflateSync(zdt.subarray(offset, offset + blockIndex.getUint32(number * 8 + 4, true)))
      blocks.set(number, data)
    }
    return data
  }

  if (idx.length % 8) throw new Error('Corrupt zLD index')
  const entries: ZldEntry[] = []
  for (let i = 0; i < idx.length / 8; i++) {
    const offset = index.getUint32(i * 8, true)
    const record = dat.subarray(offset, offset + index.getUint32(i * 8 + 4, true))
    const newline = record.indexOf(10)
    if (newline === -1 || record.length < newline + 9) throw new Error(`Corrupt zLD key record ${i}`)
    const key = decoder.decode(record.subarray(0, newline)).replace(/\r$/, '')
    const pointer = view(record.subarray(newline + 1))
    const data = block(pointer.getUint32(0, true))
    const entry = pointer.getUint32(4, true)
    const header = view(data)
    if (entry >= header.getUint32(0, true)) throw new Error(`zLD entry ${entry} is out of range for "${key}"`)
    const start = header.getUint32(4 + entry * 8, true)
    entries.push({ key, text: decoder.decode(data.subarray(start, start + header.getUint32(8 + entry * 8, true))) })
  }
  return entries
}
