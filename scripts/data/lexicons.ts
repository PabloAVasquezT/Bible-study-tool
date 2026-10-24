// Converts Strong's Greek dictionary (morphgnt) and Strong's Hebrew dictionary
// (Open Scriptures) from XML into lexicon entries. Unknown markup throws.
import type { LexiconEntry, LexiconInline } from '../../src/lib/lexicon.ts'
import { childElements, textContent, type XmlElement, type XmlNode } from './xml.ts'

type InlineConverter = (element: XmlElement) => LexiconInline | undefined

/** Converts mixed content, collapsing whitespace and merging adjacent text. */
function toInlines(nodes: XmlNode[], convert: InlineConverter): LexiconInline[] {
  const result: LexiconInline[] = []
  for (const node of nodes) {
    const inline = typeof node === 'string' ? node : convert(node)
    if (inline === undefined) continue
    const last = result.at(-1)
    if (typeof inline === 'string' && typeof last === 'string') result[result.length - 1] = last + inline
    else result.push(inline)
  }
  const normalized = result
    .map((inline) => (typeof inline === 'string' ? inline.replace(/\s+/g, ' ') : inline))
    .filter((inline) => inline !== '')
  if (typeof normalized[0] === 'string') normalized[0] = normalized[0].trimStart()
  const lastIndex = normalized.length - 1
  if (typeof normalized[lastIndex] === 'string') normalized[lastIndex] = normalized[lastIndex].trimEnd()
  return normalized.filter((inline) => inline !== '')
}

function optional(inlines: LexiconInline[]): LexiconInline[] | undefined {
  return inlines.length ? inlines : undefined
}

function strongsId(prefix: string, value: string | undefined): string {
  const match = /^0*(\d+)[a-z]?$/.exec(value ?? '')
  if (!match) throw new Error(`Bad Strong's number "${value}"`)
  return prefix + match[1]
}

const greekInline: InlineConverter = (element) => {
  switch (element.name) {
    case 'strongsref':
      return { ref: strongsId(element.attributes.language === 'HEBREW' ? 'H' : 'G', element.attributes.strongs) }
    case 'greek':
      return { word: element.attributes.unicode ?? '', lang: 'grc', translit: element.attributes.translit }
    case 'pronunciation':
      return element.attributes.strongs
    case 'latin':
      return textContent(element)
    default:
      throw new Error(`Unexpected <${element.name}> in Greek text`)
  }
}

const FIELDS = new Set(['strongs_derivation', 'strongs_def', 'kjv_def'])

/** Returns undefined for the numbers Strong left unused ("Not Used"). */
export function convertGreekEntry(entry: XmlElement): LexiconEntry | undefined {
  const id = strongsId('G', entry.attributes.strongs)
  let lemma: XmlElement | undefined
  let pronunciation: string | undefined
  const fields = new Map<string, XmlElement>()
  const loose: XmlNode[] = []

  for (const child of entry.children) {
    if (typeof child !== 'string' && child.name === 'strongs') continue
    if (typeof child !== 'string' && FIELDS.has(child.name)) {
      fields.set(child.name, child)
      continue
    }
    // The headword and its pronunciation come before the first field; later ones are part of the notes.
    if (fields.size === 0 && typeof child !== 'string') {
      if (child.name === 'greek' && !lemma) {
        lemma = child
        continue
      }
      if (child.name === 'pronunciation' && pronunciation === undefined) {
        pronunciation = child.attributes.strongs
        continue
      }
    }
    loose.push(child)
  }

  if (!lemma) {
    if (/not used/i.test(textContent(entry))) return undefined
    throw new Error(`${id} has no headword`)
  }

  const field = (name: string): LexiconInline[] | undefined => {
    const element = fields.get(name)
    return element && optional(toInlines(element.children, greekInline))
  }
  const derivation = field('strongs_derivation')
  let definition = field('strongs_def')
  // The printed dictionary joins the definition and the KJV renderings with ":--",
  // and in a few entries the colon or the dashes ended up on the wrong side.
  let usage = field('kjv_def')
  if (typeof usage?.[0] === 'string') {
    let first = usage[0].replace(/^:?-+\s*/, '')
    const separator = first.indexOf(':--')
    if (separator !== -1) {
      const moved = first.slice(0, separator).trim()
      definition = [...(definition ?? [])]
      const last = definition.at(-1)
      if (typeof last === 'string') definition[definition.length - 1] = `${last}; ${moved}`
      else definition.push(definition.length ? `; ${moved}` : moved)
      first = first.slice(separator + 3).trimStart()
    }
    usage[0] = first
    usage = optional(usage.filter((inline) => inline !== ''))
  }
  const lastDefinition = definition?.at(-1)
  if (definition && typeof lastDefinition === 'string' && lastDefinition.endsWith(':')) {
    definition[definition.length - 1] = lastDefinition.replace(/\s*:$/, '')
    definition = optional(definition.filter((inline) => inline !== ''))
  }
  const note = optional(toInlines(loose, greekInline))

  return {
    id,
    lemma: lemma.attributes.unicode ?? '',
    lang: 'grc',
    ...(lemma.attributes.translit && { translit: lemma.attributes.translit }),
    ...(pronunciation && { pronunciation }),
    ...(derivation && { derivation }),
    ...(definition && { definition }),
    ...(usage && { usage }),
    ...(note && { note })
  }
}

const HEBREW_LANGS: Record<string, string> = { heb: 'he', arc: 'arc', 'x-pn': 'he' }

const hebrewInline: InlineConverter = (element) => {
  switch (element.name) {
    case 'w':
      if (element.attributes.src) return { ref: strongsId('H', element.attributes.src.slice(1)) }
      return { word: textContent(element), lang: 'he', ...(element.attributes.xlit && { translit: element.attributes.xlit }) }
    case 'def':
      return { def: textContent(element).replace(/\s+/g, ' ').trim() }
    case 'note':
      // Editors' notes on their corrections ("number 250, corrected to 251"), not dictionary text.
      return undefined
    default:
      throw new Error(`Unexpected <${element.name}> in Hebrew text`)
  }
}

const HEBREW_CHILDREN = new Set(['w', 'source', 'meaning', 'usage', 'note'])

export function convertHebrewEntry(entry: XmlElement): LexiconEntry {
  const id = entry.attributes.id ?? ''
  if (!/^H\d+$/.test(id)) throw new Error(`Bad Hebrew entry id "${id}"`)
  for (const child of childElements(entry)) {
    if (!HEBREW_CHILDREN.has(child.name)) throw new Error(`${id}: unexpected <${child.name}>`)
  }
  const [lemma] = childElements(entry, 'w')
  if (!lemma) throw new Error(`${id} has no headword`)
  const field = (name: string): LexiconInline[] | undefined => {
    const [element] = childElements(entry, name)
    return element && optional(toInlines(element.children, hebrewInline))
  }

  const derivation = field('source')
  const definition = field('meaning')
  const usage = field('usage')

  // <note> holds the editors' notes about corrections, not dictionary content, so it is left out.
  return {
    id,
    lemma: textContent(lemma).trim(),
    lang: HEBREW_LANGS[lemma.attributes['xml:lang'] ?? ''] ?? 'he',
    ...(lemma.attributes.xlit && { translit: lemma.attributes.xlit }),
    ...(lemma.attributes.pron && { pronunciation: lemma.attributes.pron }),
    ...(lemma.attributes.pos && { partOfSpeech: lemma.attributes.pos }),
    ...(derivation && { derivation }),
    ...(definition && { definition }),
    ...(usage && { usage })
  }
}
