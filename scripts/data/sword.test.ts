import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deflateSync } from 'node:zlib'
import { readZld, type ZldFiles } from './sword.ts'

const u32 = (...values: number[]): Buffer => {
  const buffer = Buffer.alloc(values.length * 4)
  values.forEach((value, index) => buffer.writeUInt32LE(value, index * 4))
  return buffer
}

/** Builds a zLD module with each block holding the given entries. */
function makeZld(blocks: [key: string, text: string][][]): ZldFiles {
  const idx: Buffer[] = []
  const dat: Buffer[] = []
  const zdx: Buffer[] = []
  const zdt: Buffer[] = []
  let datSize = 0
  let zdtSize = 0
  blocks.forEach((entries, blockNumber) => {
    const texts = entries.map(([, text]) => Buffer.from(text))
    let offset = 4 + entries.length * 8
    const header = u32(entries.length, ...texts.flatMap((text) => [(offset += text.length) - text.length, text.length]))
    const compressed = deflateSync(Buffer.concat([header, ...texts]))
    zdx.push(u32(zdtSize, compressed.length))
    zdt.push(compressed)
    zdtSize += compressed.length
    entries.forEach(([key], entry) => {
      const record = Buffer.concat([Buffer.from(`${key}\n`), u32(blockNumber, entry)])
      idx.push(u32(datSize, record.length))
      dat.push(record)
      datSize += record.length
    })
  })
  return { idx: Buffer.concat(idx), dat: Buffer.concat(dat), zdx: Buffer.concat(zdx), zdt: Buffer.concat(zdt) }
}

test('reads entries across compressed blocks', () => {
  const module = makeZld([
    [
      ['AARON', '<entryFree n="Aaron"/>'],
      ['ABBA', 'Father']
    ],
    [['ZUR', 'A rock — Zur']]
  ])
  assert.deepEqual(readZld(module), [
    { key: 'AARON', text: '<entryFree n="Aaron"/>' },
    { key: 'ABBA', text: 'Father' },
    { key: 'ZUR', text: 'A rock — Zur' }
  ])
})

test('rejects corrupt modules', () => {
  const module = makeZld([[['A', 'text']]])
  assert.throws(() => readZld({ ...module, idx: module.idx.subarray(0, 5) }), /Corrupt zLD index/)
  assert.throws(() => readZld({ ...module, zdx: Buffer.alloc(0) }), /out of range/)
})
