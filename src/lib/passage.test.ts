import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { BookInfo } from './bible.ts'
import { adjacentChapter, parsePassagePath, parseSearchPath, passagePath, searchPath } from './passage.ts'

test('builds and recognizes search paths', () => {
  assert.equal(searchPath('kjv'), '/kjv/search')
  assert.equal(searchPath('kjv', ' God so loved '), '/kjv/search?q=God%20so%20loved')
  assert.equal(parseSearchPath('/rv1909/search'), 'rv1909')
  assert.equal(parseSearchPath('/kjv/jhn/3'), undefined)
})

test('parses chapter and verse paths, in any case', () => {
  assert.deepEqual(parsePassagePath('/kjv/jhn/3'), { bible: 'kjv', book: 'JHN', chapter: 3 })
  assert.deepEqual(parsePassagePath('/kjv/JHN/3/16/'), { bible: 'kjv', book: 'JHN', chapter: 3, verse: 16 })
})

test('rejects malformed paths', () => {
  for (const path of ['/', '/kjv', '/kjv/jhn', '/kjv/xyz/1', '/kjv/jhn/0', '/kjv/jhn/03', '/kjv/jhn/3/x', '/kjv/jhn/3/16/1', '/KJV!/jhn/1']) {
    assert.equal(parsePassagePath(path), undefined, path)
  }
})

test('formats paths that parse back to the same passage', () => {
  const passage = { bible: 'kjv', book: '1JN', chapter: 4, verse: 8 } as const
  assert.equal(passagePath(passage), '/kjv/1jn/4/8')
  assert.deepEqual(parsePassagePath(passagePath(passage)), passage)
})

test('moves between chapters across book boundaries', () => {
  const books: BookInfo[] = [
    { id: 'GEN', name: 'Genesis', abbreviation: 'Gen', title: 'Genesis', verses: [31, 25] },
    { id: 'EXO', name: 'Exodus', abbreviation: 'Exo', title: 'Exodus', verses: [22, 25, 22] }
  ]
  assert.deepEqual(adjacentChapter(books, { book: 'GEN', chapter: 1 }, 1), { book: 'GEN', chapter: 2 })
  assert.deepEqual(adjacentChapter(books, { book: 'GEN', chapter: 2 }, 1), { book: 'EXO', chapter: 1 })
  assert.deepEqual(adjacentChapter(books, { book: 'EXO', chapter: 1 }, -1), { book: 'GEN', chapter: 2 })
  assert.equal(adjacentChapter(books, { book: 'GEN', chapter: 1 }, -1), undefined)
  assert.equal(adjacentChapter(books, { book: 'EXO', chapter: 3 }, 1), undefined)
})
