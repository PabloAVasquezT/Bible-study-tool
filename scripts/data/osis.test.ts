import assert from 'node:assert/strict'
import { test } from 'node:test'
import { convertOsisRange } from './osis.ts'

test('converts OSIS book codes and ranges to USFM codes', () => {
  assert.deepEqual(convertOsisRange('1John.4.8'), { start: { book: '1JN', chapter: 4, verse: 8 } })
  assert.deepEqual(convertOsisRange('Lev.27.34-Num.1.1'), {
    start: { book: 'LEV', chapter: 27, verse: 34 },
    end: { book: 'NUM', chapter: 1, verse: 1 }
  })
  assert.deepEqual(convertOsisRange('3John.1.15', { '3John.1.15': '3John.1.14' }), { start: { book: '3JN', chapter: 1, verse: 14 } })
  assert.throws(() => convertOsisRange('Tob.1.1'), /Unknown OSIS book "Tob"/)
  assert.throws(() => convertOsisRange('Gen.1'), /Malformed reference/)
})
