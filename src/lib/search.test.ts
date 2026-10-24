import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { BookInfo } from './bible.ts'
import {
  decodePostings,
  encodePostings,
  intersect,
  matchesWord,
  normalizeWord,
  parseQuery,
  splitWords,
  strongsFile,
  union,
  verseLocator,
  wordFile,
  wordsOf
} from './search.ts'

test('normalizes case and accents but keeps ñ', () => {
  assert.equal(normalizeWord('Crió'), 'crio')
  assert.equal(normalizeWord('ÉXODO'), 'exodo')
  assert.equal(normalizeWord('Año'), 'año')
  assert.equal(normalizeWord('Ænon'), 'aenon')
  assert.deepEqual(wordsOf('EN el principio crió Dios; hinds’ feet'), ['en', 'el', 'principio', 'crio', 'dios', 'hinds', 'feet'])
})

test('splits text into words and the text between them', () => {
  assert.deepEqual(splitWords('God, the LORD.'), [
    { text: 'God', word: 'god' },
    { text: ', ' },
    { text: 'the', word: 'the' },
    { text: ' ' },
    { text: 'LORD', word: 'lord' },
    { text: '.' }
  ])
})

test('parses words, prefixes and Strong numbers', () => {
  assert.deepEqual(parseQuery('  Love  G0026 believ* h430 love '), [
    { kind: 'word', value: 'love' },
    { kind: 'strong', value: 'G26' },
    { kind: 'prefix', value: 'believ' },
    { kind: 'strong', value: 'H430' }
  ])
  assert.deepEqual(parseQuery('* ,'), [])
  assert.ok(matchesWord('believeth', parseQuery('believ*')))
  assert.ok(!matchesWord('belief', parseQuery('believ*')))
})

test('names the index files', () => {
  assert.equal(wordFile('love'), 'l')
  assert.equal(wordFile('ñame'), '_')
  assert.equal(strongsFile('G2424'), 'G4')
  assert.equal(strongsFile('H430'), 'H0')
})

test('encodes postings as differences and combines them', () => {
  const postings = [3, 10, 11, 400]
  assert.deepEqual(encodePostings(postings), [3, 7, 1, 389])
  assert.deepEqual(decodePostings(encodePostings(postings)), postings)
  assert.deepEqual(intersect([1, 3, 5, 9], [3, 4, 9, 10]), [3, 9])
  assert.deepEqual(union([[5, 9], [1, 5], []]), [1, 5, 9])
})

test('locates verses numbered across the whole Bible', () => {
  const books: BookInfo[] = [
    { id: 'GEN', name: 'Genesis', abbreviation: 'Gen', title: 'Genesis', verses: [31, 25] },
    { id: 'EXO', name: 'Exodus', abbreviation: 'Exo', title: 'Exodus', verses: [22] }
  ]
  const { locate, total } = verseLocator(books)
  assert.equal(total, 78)
  assert.deepEqual(locate(0), { book: 'GEN', chapter: 1, verse: 1 })
  assert.deepEqual(locate(31), { book: 'GEN', chapter: 2, verse: 1 })
  assert.deepEqual(locate(77), { book: 'EXO', chapter: 1, verse: 22 })
  assert.throws(() => locate(78), RangeError)
})
