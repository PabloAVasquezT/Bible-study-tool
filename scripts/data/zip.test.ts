import assert from 'node:assert/strict'
import { test } from 'node:test'
import { crc32, deflateRawSync } from 'node:zlib'
import { readZip } from './zip.ts'

/** Builds a ZIP archive in memory with the given entries. */
function makeZip(entries: { name: string; content: string; deflate: boolean }[]): Uint8Array {
  const parts: Buffer[] = []
  const directory: Buffer[] = []
  let offset = 0
  for (const { name, content, deflate } of entries) {
    const raw = Buffer.from(content)
    const data = deflate ? deflateRawSync(raw) : raw
    const fileName = Buffer.from(name)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(deflate ? 8 : 0, 8)
    local.writeUInt32LE(crc32(raw), 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(raw.length, 22)
    local.writeUInt16LE(fileName.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(deflate ? 8 : 0, 10)
    central.writeUInt32LE(crc32(raw), 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(raw.length, 24)
    central.writeUInt16LE(fileName.length, 28)
    central.writeUInt32LE(offset, 42)
    parts.push(local, fileName, data)
    directory.push(central, fileName)
    offset += local.length + fileName.length + data.length
  }
  const directorySize = directory.reduce((size, part) => size + part.length, 0)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(directorySize, 12)
  end.writeUInt32LE(offset, 16)
  return new Uint8Array(Buffer.concat([...parts, ...directory, end]))
}

test('reads stored and deflated entries', () => {
  const zip = makeZip([
    { name: 'a.txt', content: 'stored text', deflate: false },
    { name: 'dir/b.txt', content: 'deflated text '.repeat(20), deflate: true }
  ])
  const entries = readZip(zip)
  const decoder = new TextDecoder()
  assert.deepEqual([...entries.keys()], ['a.txt', 'dir/b.txt'])
  assert.equal(decoder.decode(entries.get('a.txt')), 'stored text')
  assert.equal(decoder.decode(entries.get('dir/b.txt')), 'deflated text '.repeat(20))
})

test('detects corrupted content', () => {
  const zip = makeZip([{ name: 'a.txt', content: 'stored text', deflate: false }])
  const firstDataByte = 30 + 'a.txt'.length
  zip[firstDataByte] = zip[firstDataByte]! ^ 0xff
  assert.throws(() => readZip(zip), /CRC mismatch/)
})

test('rejects data that is not a ZIP archive', () => {
  assert.throws(() => readZip(new TextEncoder().encode('not a zip file at all, just some text')), /Not a ZIP file/)
})
