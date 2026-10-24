import assert from 'node:assert/strict'
import { test } from 'node:test'
import { convertGreekEntry, convertHebrewEntry } from './lexicons.ts'
import { parseXml } from './xml.ts'

test('converts a Greek entry with references, notes and KJV renderings', () => {
  const entry = parseXml(
    '<entry strongs="00026"><strongs>26</strongs> <greek BETA="A)GA/PH" unicode="ἀγάπη" translit="agápē"/> ' +
      '<pronunciation strongs="ag-ah\'-pay"/>\n<strongs_derivation>from <strongsref language="GREEK" strongs="25"/>;</strongs_derivation>' +
      '<strongs_def> love, i.e.\n affection</strongs_def><kjv_def>:--charity, love.</kjv_def> Compare <strongsref language="HEBREW" strongs="0157"/>.</entry>'
  )
  assert.deepEqual(convertGreekEntry(entry), {
    id: 'G26',
    lemma: 'ἀγάπη',
    lang: 'grc',
    translit: 'agápē',
    pronunciation: "ag-ah'-pay",
    derivation: ['from ', { ref: 'G25' }, ';'],
    definition: ['love, i.e. affection'],
    usage: ['charity, love.'],
    note: ['Compare ', { ref: 'H157' }, '.']
  })
})

test('cleans up the ":--" between definition and KJV renderings', () => {
  const entry = convertGreekEntry(
    parseXml('<entry strongs="1"><greek unicode="Α" translit="A"/><strongs_def>the first:</strongs_def><kjv_def>--Alpha.</kjv_def></entry>')
  )
  assert.deepEqual(entry?.definition, ['the first'])
  assert.deepEqual(entry?.usage, ['Alpha.'])
  const misplaced = convertGreekEntry(
    parseXml('<entry strongs="2022"><greek unicode="ἐπιχέω" translit="epichéō"/><kjv_def>:--to pour upon:--pour in.</kjv_def></entry>')
  )
  assert.deepEqual(misplaced?.definition, ['to pour upon'])
  assert.deepEqual(misplaced?.usage, ['pour in.'])
})

test('skips the Greek numbers Strong left unused', () => {
  assert.equal(convertGreekEntry(parseXml('<entry strongs="02717"><strongs>2717</strongs> Not Used</entry>')), undefined)
})

test('converts a Hebrew entry with core meanings and references', () => {
  const entry = parseXml(
    '<entry id="H430"><w pos="n-m" pron="el-o-heem\'" xlit="ʼĕlôhîym" xml:lang="heb">אֱלֹהִים</w>' +
      '<source>plural of <w src="H433">433</w><note>number 432, corrected to 433</note>;</source><meaning><def>gods</def> in the ordinary sense</meaning>' +
      '<usage>angels, God.</usage><note>editorial note</note></entry>'
  )
  assert.deepEqual(convertHebrewEntry(entry), {
    id: 'H430',
    lemma: 'אֱלֹהִים',
    lang: 'he',
    translit: 'ʼĕlôhîym',
    pronunciation: "el-o-heem'",
    partOfSpeech: 'n-m',
    derivation: ['plural of ', { ref: 'H433' }, ';'],
    definition: [{ def: 'gods' }, ' in the ordinary sense'],
    usage: ['angels, God.']
  })
})

test('rejects unknown markup', () => {
  assert.throws(() => convertHebrewEntry(parseXml('<entry id="H1"><w>אָב</w><extra/></entry>')), /unexpected <extra>/)
  assert.throws(
    () => convertGreekEntry(parseXml('<entry strongs="1"><greek unicode="Α"/><strongs_def><b>x</b></strongs_def></entry>')),
    /Unexpected <b>/
  )
})
