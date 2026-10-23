// Minimal ZIP reader: enough for the stored and deflated entries that upstream
// archives use. No ZIP64, no encryption. Entries are read into memory, never extracted.
import { crc32, inflateRawSync } from 'node:zlib'

const END_OF_CENTRAL_DIRECTORY = 0x06054b50
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50
const LOCAL_FILE_HEADER = 0x04034b50

export function readZip(data: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)

  // The end-of-central-directory record sits at the end, followed by an optional comment.
  let end = data.length - 22
  while (end >= 0 && view.getUint32(end, true) !== END_OF_CENTRAL_DIRECTORY) end--
  if (end < 0) throw new Error('Not a ZIP file')

  const count = view.getUint16(end + 10, true)
  let offset = view.getUint32(end + 16, true)
  const decoder = new TextDecoder()
  const entries = new Map<string, Uint8Array>()

  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== CENTRAL_DIRECTORY_ENTRY) throw new Error('Corrupt ZIP central directory')
    const flags = view.getUint16(offset + 8, true)
    const method = view.getUint16(offset + 10, true)
    const crc = view.getUint32(offset + 16, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localOffset = view.getUint32(offset + 42, true)
    const name = decoder.decode(data.subarray(offset + 46, offset + 46 + nameLength))
    offset += 46 + nameLength + extraLength + commentLength

    if (name.endsWith('/')) continue
    if (flags & 1) throw new Error(`Encrypted ZIP entry: ${name}`)
    if (compressedSize === 0xffffffff || localOffset === 0xffffffff) throw new Error(`ZIP64 entry: ${name}`)
    if (view.getUint32(localOffset, true) !== LOCAL_FILE_HEADER) throw new Error(`Corrupt ZIP entry: ${name}`)

    const start = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true)
    const raw = data.subarray(start, start + compressedSize)
    let content: Uint8Array
    if (method === 0) content = raw
    else if (method === 8) content = inflateRawSync(raw)
    else throw new Error(`Unsupported ZIP compression method ${method}: ${name}`)

    if (crc32(content) !== crc) throw new Error(`CRC mismatch in ZIP entry: ${name}`)
    entries.set(name, content)
  }
  return entries
}
