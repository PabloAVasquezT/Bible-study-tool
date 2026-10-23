import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseUsfm } from './usfm.ts'

const header = '\\id GEN Genesis\n\\h Genesis\n\\toc1 The First Book of Moses, called Genesis\n\\toc2 Genesis\n\\toc3 Gen\n\\mt1 Genesis\n'

test('reads book names, Strong numbers and added words', () => {
  const book = parseUsfm(
    header +
      '\\c 1\n\\p\n\\v 1 In the \\w beginning|strong="H7225"\\w* \\w God|strong="H0430"\\w* created.  \n' +
      '\\v 2 And \\w darkness|strong="H2822"\\w* \\add was\\add* upon the deep.\n'
  )
  assert.equal(book.id, 'GEN')
  assert.equal(book.name, 'Genesis')
  assert.equal(book.abbreviation, 'Gen')
  assert.equal(book.title, 'The First Book of Moses, called Genesis')
  assert.deepEqual(book.chapters[0]!.verses, [
    {
      break: 'paragraph',
      text: ['In the ', { t: 'beginning', s: 'H7225' }, ' ', { t: 'God', s: 'H430' }, ' created.']
    },
    { text: ['And ', { t: 'darkness', s: 'H2822' }, ' ', { t: 'was', f: 1 }, ' upon the deep.'] }
  ])
})

test('reads psalm titles, stanzas and the divine name', () => {
  const book = parseUsfm(
    '\\id PSA\n\\toc2 Psalms\n\\c 1\n\\q1\n\\v 1 Blessed.\n\\c 2\n\\d A \\w Psalm|strong="H4210"\\w* of David.\n' +
      '\\q1\n\\v 1 \\nd \\+w LORD|strong="H3068"\\+w*\\nd*, how\n\\b\n\\q1\n\\v 2 Many.\n'
  )
  const chapter = book.chapters[1]!
  assert.deepEqual(chapter.title, ['A ', { t: 'Psalm', s: 'H4210' }, ' of David.'])
  assert.deepEqual(chapter.verses, [
    { break: 'line', text: [{ t: 'LORD', s: 'H3068', f: 2 }, ', how'] },
    { break: 'stanza', text: ['Many.'] }
  ])
})

test('reads notes and the words of Jesus', () => {
  const book = parseUsfm(
    '\\id MAT\n\\toc2 Matthew\n\\c 1\n\\v 1 He said, \\wj \\+w Suffer|strong="G0863"\\+w* \\+add it\\+add* now\\wj*.' +
      '\\f + \\fr 1.1 \\ft the \\+nd LORD\\+nd*: or, Heb.\\f*  \n'
  )
  assert.deepEqual(book.chapters[0]!.verses[0]!.text, [
    'He said, ',
    { t: 'Suffer', s: 'G863', f: 4 },
    ' ',
    { t: 'it', f: 5 },
    { t: ' now', f: 4 },
    '.',
    { note: ['the ', { t: 'LORD', f: 2 }, ': or, Heb.'] }
  ])
})

test('attaches headings to the next verse and trailing text to the chapter', () => {
  const book = parseUsfm(
    '\\id ROM\n\\toc2 Romans\n\\c 1\n\\s1 \\tl ALEPH.\\tl*\n\\q1\n\\v 1 Grace.\n\\s1 Written to the Romans.\n'
  )
  const chapter = book.chapters[0]!
  assert.deepEqual(chapter.verses[0], { break: 'line', heading: ['ALEPH.'], text: ['Grace.'] })
  assert.deepEqual(chapter.subscription, ['Written to the Romans.'])
})

test('rejects unknown markers and out-of-order verses', () => {
  assert.throws(() => parseUsfm('\\id GEN\n\\toc2 Genesis\n\\c 1\n\\v 1 Text \\xyz more\n'), /Unsupported marker \\xyz/)
  assert.throws(() => parseUsfm('\\id GEN\n\\toc2 Genesis\n\\c 1\n\\v 2 Text\n'), /Verse 2 is out of order/)
})
