import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { BookId } from './books.ts'
import { formatVerseRange, parseVerseRange, rangeLabel } from './crossrefs.ts'

const names: Partial<Record<BookId, string>> = { ROM: 'Romans', '1JN': '1 John', PSA: 'Psalms', LEV: 'Leviticus', NUM: 'Numbers' }
const bookName = (book: BookId): string => names[book] ?? book

test('labels verses and ranges', () => {
  assert.equal(rangeLabel(parseVerseRange('ROM.5.8')!, bookName), 'Romans 5:8')
  assert.equal(rangeLabel(parseVerseRange('1JN.4.9-1JN.4.10')!, bookName), '1 John 4:9–10')
  assert.equal(rangeLabel(parseVerseRange('PSA.119.176-PSA.120.2')!, bookName), 'Psalms 119:176–120:2')
  assert.equal(rangeLabel(parseVerseRange('LEV.27.34-NUM.1.1')!, bookName), 'Leviticus 27:34 – Numbers 1:1')
})

test('parses single verses and ranges, also across books', () => {
  assert.deepEqual(parseVerseRange('JHN.3.16'), { start: { book: 'JHN', chapter: 3, verse: 16 } })
  assert.deepEqual(parseVerseRange('LEV.27.34-NUM.1.1'), {
    start: { book: 'LEV', chapter: 27, verse: 34 },
    end: { book: 'NUM', chapter: 1, verse: 1 }
  })
})

test('rejects malformed references', () => {
  for (const text of ['', 'JHN.3', 'XYZ.1.1', 'JHN.0.1', 'JHN.3.16-', 'JHN.3.16-JHN.3.17-JHN.3.18', 'jhn.3.16']) {
    assert.equal(parseVerseRange(text), undefined, text)
  }
})

test('formats references that parse back to the same range', () => {
  for (const text of ['1JN.4.8', 'PSA.119.1-PSA.119.8', '2CH.36.22-EZR.1.3']) {
    assert.equal(formatVerseRange(parseVerseRange(text)!), text)
  }
})
