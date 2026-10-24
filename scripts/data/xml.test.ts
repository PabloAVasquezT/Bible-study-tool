import assert from 'node:assert/strict'
import { test } from 'node:test'
import { childElements, parseXml, textContent } from './xml.ts'

test('parses elements, attributes, text and entities', () => {
  const root = parseXml(
    "<?xml version='1.0'?>\n<!DOCTYPE d [ <!ELEMENT d (e)+ > ]>\n<!-- comment -->\n" +
      '<d><e id="1" xml:lang=\'heb\'>a &amp; b &#x5D0;</e><e id="2"/><![CDATA[<raw>]]></d>'
  )
  assert.equal(root.name, 'd')
  const [first, second] = childElements(root, 'e')
  assert.deepEqual(first!.attributes, { id: '1', 'xml:lang': 'heb' })
  assert.equal(textContent(first!), 'a & b א')
  assert.deepEqual(second!.children, [])
  assert.equal(root.children.at(-1), '<raw>')
})

test('rejects malformed documents', () => {
  assert.throws(() => parseXml('<a><b></a>'), /Unexpected <\/a>/)
  assert.throws(() => parseXml('<a>'), /Unclosed <a>/)
  assert.throws(() => parseXml('<a>&nbsp;</a>'), /Unknown XML entity/)
  assert.throws(() => parseXml('<a></a><b></b>'), /exactly one root/)
})
