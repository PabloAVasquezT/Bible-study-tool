import assert from 'node:assert/strict'
import { test } from 'node:test'
import { groupByVerse, parseOpenBible } from './crossrefs.ts'

const TSV = [
  'From Verse\tTo Verse\tVotes\t#www.openbible.info CC-BY 2026-10-19',
  'Gen.1.1\tRev.14.7\t82',
  'Gen.1.1\tActs.14.15\t90',
  'Gen.1.1\tPs.134.3\t-3',
  'Gen.1.1\tIsa.65.17\t0',
  'Num.3.1\tLev.27.34-Num.1.1\t2',
  '3John.1.14\t3John.1.15\t5',
  ''
].join('\n')

test('groups by verse, best voted first, without down-voted references', () => {
  const grouped = groupByVerse(parseOpenBible(TSV))
  assert.deepEqual(grouped.get('GEN.1.1'), ['ACT.14.15', 'REV.14.7'])
  assert.deepEqual(grouped.get('NUM.3.1'), ['LEV.27.34-NUM.1.1'])
})

test('drops references that the versification fixes turn into self-references', () => {
  const grouped = groupByVerse(parseOpenBible(TSV, { '3John.1.15': '3John.1.14' }))
  assert.equal(grouped.has('3JN.1.14'), false)
})

test('rejects unexpected input', () => {
  assert.throws(() => parseOpenBible('From\tTo\n'), /Unexpected header/)
  assert.throws(() => parseOpenBible('From Verse\tTo Verse\tVotes\nGen.1.1\tRev.1.1\tmany'), /Malformed line/)
})
