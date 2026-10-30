import assert from 'node:assert/strict'
import { test } from 'node:test'
import { entryFile, entrySlug } from '../../src/lib/articles.ts'
import { convertDevotionalDay, convertEastonEntry, keyPassage, resolveBareReference, type Stats } from './articles.ts'
import type { Versification } from './kjv.ts'
import { parseXml } from './xml.ts'

// Every chapter has 30 verses, except that Revelation has no chapter 23.
const kjv: Versification = {
  versesIn: (book, chapter) => (book === 'REV' && chapter === 23 ? 0 : 30),
  exists: (target) => {
    const refs = 'start' in target ? [target.start, target.end] : [target]
    return refs.every((ref) => !ref || ref.verse <= kjv.versesIn(ref.book, ref.chapter))
  }
}

const newStats = (): Stats => ({ unlinked: 0, repaired: 0 })

test('makes entry ids for URLs and files', () => {
  assert.equal(entrySlug('ZUPH, LAND OF'), 'zuph-land-of')
  assert.equal(entrySlug('AARON'), 'aaron')
  assert.equal(entryFile('zuph-land-of'), 'z')
  assert.equal(entryFile('1-kings'), '_')
})

test('resolves references written with numbers only', () => {
  const previous = { book: 'EXO', chapter: 4, verse: 14 } as const
  assert.deepEqual(resolveBareReference('27-30', previous), {
    start: { book: 'EXO', chapter: 4, verse: 27 },
    end: { book: 'EXO', chapter: 4, verse: 30 }
  })
  assert.deepEqual(resolveBareReference('7:7', previous), { start: { book: 'EXO', chapter: 7, verse: 7 } })
  assert.deepEqual(resolveBareReference('11: 32-36', previous), {
    start: { book: 'EXO', chapter: 11, verse: 32 },
    end: { book: 'EXO', chapter: 11, verse: 36 }
  })
  assert.deepEqual(resolveBareReference('2:1-3:4', previous), {
    start: { book: 'EXO', chapter: 2, verse: 1 },
    end: { book: 'EXO', chapter: 3, verse: 4 }
  })
  assert.equal(resolveBareReference('ff.', previous), undefined)
})

test('converts an Easton entry, repairing references linked to the wrong book', () => {
  const stats = newStats()
  const entry = convertEastonEntry(
    'AARON',
    parseXml(
      '<entryFree n="Aaron">\n<title>Aaron</title>\n<p>The son of Amram (<ref osisRef="Bible:Exod.6.20">Ex. 6:20</ref>). ' +
        'Sent by God (<ref osisRef="Bible:Exod.4.14">Ex. 4:14</ref>,<ref osisRef="Bible:Gen.1.27-Gen.1.30">27-30</ref>) ' +
        'and (<ref osisRef="Bible:Exod.4.25">25</ref>; <ref osisRef="Bible:Num.12">Num. 12</ref>) to meet ' +
        '<ref target="Easton:MOSES">MOSES</ref>, the <foreign rend="italic">navi</foreign>. ' +
        'See <ref osisRef="Bible:Rev.23.1">Rev. 23:1</ref> and <ref osisRef="Bible:1Macc.1.57">1 Macc. 1:57</ref>.</p>\n</entryFree>'
    ),
    kjv,
    stats
  )
  assert.deepEqual(entry, {
    id: 'aaron',
    title: 'Aaron',
    blocks: [
      {
        p: [
          'The son of Amram (',
          { t: 'Ex. 6:20', ref: 'EXO.6.20' },
          '). Sent by God (',
          { t: 'Ex. 4:14', ref: 'EXO.4.14' },
          ',',
          { t: '27-30', ref: 'EXO.4.27-EXO.4.30' },
          ') and (',
          { t: '25', ref: 'EXO.4.25' },
          '; ',
          { t: 'Num. 12', ref: 'NUM.12.1-NUM.12.30' },
          ') to meet ',
          { t: 'MOSES', entry: 'moses' },
          ', the ',
          { t: 'navi', style: 'italic' },
          '. See Rev. 23:1 and 1 Macc. 1:57.'
        ]
      }
    ]
  })
  assert.deepEqual(stats, { unlinked: 2, repaired: 1 })
})

test('converts a devotional day with both readings, line breaks and a poem', () => {
  const stats = newStats()
  const day = convertDevotionalDay(
    '01.01',
    parseXml(
      '<div type="entry" osisID="01.01"><div type="section" osisID="01.01.am"><title>Morning, January 1</title>' +
        '<p><hi type="italic">“They did eat.”</hi><lb/><reference osisRef="Bible:Josh.5.12">Joshua 5:12</reference></p>' +
        '<p>The <hi type="small-caps">Lord</hi> is good. <reference osisRef="Bible:Judg.24">Jude 24</reference>; ' +
        '<reference osisRef="Bible:Phil.3.13 Bible:Phil.3.14">Philippians, 3:13, 14</reference>.</p>' +
        '<lg>  <l>“My God, I am thine</l>  <l>What a <hi type="italic">blessing</hi>”</l></lg></div>' +
        '<div type="section" osisID="01.01.pm"><title>Evening, January 1</title><p>Rest.</p></div></div>'
    ),
    kjv,
    stats
  )
  assert.deepEqual(day.morning, {
    title: 'Morning, January 1',
    blocks: [
      { p: [{ t: '“They did eat.”', style: 'italic' }, '\n', { t: 'Joshua 5:12', ref: 'JOS.5.12' }] },
      {
        p: [
          'The ',
          { t: 'Lord', style: 'smallCaps' },
          ' is good. ',
          { t: 'Jude 24', ref: 'JUD.1.24' },
          '; ',
          { t: 'Philippians, 3:13, 14', ref: 'PHP.3.13' },
          '.'
        ]
      },
      { poem: [['“My God, I am thine'], ['What a ', { t: 'blessing', style: 'italic' }, '”']] }
    ]
  })
  assert.deepEqual(day.evening, { title: 'Evening, January 1', blocks: [{ p: ['Rest.'] }] })
  assert.deepEqual(stats, { unlinked: 0, repaired: 0 })
  assert.equal(keyPassage(day.morning), 'JOS.5.12')
  assert.equal(keyPassage(day.evening), undefined)
})

test('rejects unknown markup', () => {
  const stats = newStats()
  assert.throws(() => convertEastonEntry('X', parseXml('<entryFree><title>X</title><table/></entryFree>'), kjv, stats), /unexpected <table>/)
  assert.throws(
    () => convertDevotionalDay('01.01', parseXml('<div><div osisID="01.01.am"><title>M</title><p>x</p></div></div>'), kjv, stats),
    /expected a morning and an evening/
  )
})
