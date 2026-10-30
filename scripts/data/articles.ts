// Converts SWORD entries to our article format: Easton's dictionary (TEI) and Spurgeon's
// Morning and Evening (OSIS). Unknown markup throws.
import type { ArticleBlock, ArticleInline, DevotionalDay, DevotionalReading, DictionaryEntry } from '../../src/lib/articles.ts'
import { entrySlug } from '../../src/lib/articles.ts'
import type { BookId } from '../../src/lib/books.ts'
import { formatVerseRange, type VerseRange, type VerseRef } from '../../src/lib/crossrefs.ts'
import type { Versification } from './kjv.ts'
import { convertOsisRange } from './osis.ts'
import { childElements, textContent, type XmlElement, type XmlNode } from './xml.ts'

/** Counts what the converters fixed or left out, so the build can report it. */
export interface Stats {
  /** Bible references kept as plain text because they could not be resolved. */
  unlinked: number
  /** Bible references whose book or chapter was taken from the reference before them. */
  repaired: number
}

/** Appends to a list of inlines, merging plain text and collapsing whitespace (but not "\n"). */
function push(list: ArticleInline[], inline: ArticleInline): void {
  const text = (value: string): string => value.replace(/[ \t\r\n]+/g, ' ')
  const item = typeof inline === 'string' ? text(inline) : { ...inline, t: text(inline.t).trim() }
  const last = list.at(-1)
  if (typeof item === 'string' && typeof last === 'string') list[list.length - 1] = last + item
  else if (item !== '') list.push(item)
}

function lineBreak(list: ArticleInline[]): void {
  const last = list.at(-1)
  if (typeof last === 'string') list[list.length - 1] = `${last.trimEnd()}\n`
  else list.push('\n')
}

/** Trims the ends of a block and the spaces around line breaks. */
function tidy(list: ArticleInline[]): ArticleInline[] {
  const result = list.map((inline) => (typeof inline === 'string' ? inline.replace(/ *\n */g, '\n') : inline))
  if (typeof result[0] === 'string') result[0] = result[0].trimStart()
  const last = result.length - 1
  if (typeof result[last] === 'string') result[last] = result[last].trimEnd()
  return result.filter((inline) => inline !== '')
}

function onlyText(element: XmlElement): string {
  const nested = childElements(element)[0]
  if (nested) throw new Error(`Unexpected <${nested.name}> inside <${element.name}>`)
  return textContent(element)
}

/**
 * Converts "Bible:Josh.5.12" to a range, or undefined when it is not a valid reference.
 * With `wholeChapters`, "Bible:Num.12" becomes all of Numbers 12.
 */
function bibleRef(osisRef: string | undefined, kjv: Versification, wholeChapters = false): VerseRange | undefined {
  if (!osisRef?.startsWith('Bible:')) return undefined
  // A few attributes hold several references ("Bible:Phil.3.13 Bible:Phil.3.14"); the first is enough.
  let osis = osisRef.split(/\s+/)[0]!.slice('Bible:'.length)
  if (wholeChapters && /^[1-3]?[A-Za-z]+\.\d+$/.test(osis)) {
    const [book = '', chapter = ''] = osis.split('.')
    osis = `${book}.${chapter}.1-${book}.${chapter}.999`
  }
  let range: VerseRange
  try {
    range = convertOsisRange(osis)
  } catch {
    return undefined
  }
  if (range.end?.verse === 999) {
    const verses = kjv.versesIn(range.end.book, range.end.chapter)
    if (!verses) return undefined
    range = { start: range.start, end: { ...range.end, verse: verses } }
  }
  return kjv.exists(range) ? range : undefined
}

/**
 * Resolves a reference written with numbers only, after `previous`: "27-30" after Exodus 4:14
 * is Exodus 4:27–30, and "7:7" is Exodus 7:7.
 */
export function resolveBareReference(label: string, previous: VerseRef): VerseRange | undefined {
  const match = /^(\d+)(?:\s*:\s*(\d+))?(?:\s*[-–]\s*(\d+)(?:\s*:\s*(\d+))?)?$/.exec(label.trim())
  if (!match) return undefined
  const [, a, b, c, d] = match.map((part) => (part === undefined ? undefined : Number(part)))
  const book: BookId = previous.book
  // "v", "v-w": verses of the previous chapter. "c:v", "c:v-w", "c:v-d:w": chapter and verse.
  const start = b === undefined ? { book, chapter: previous.chapter, verse: a! } : { book, chapter: a!, verse: b }
  if (c === undefined) return { start }
  const end = d === undefined ? { book, chapter: start.chapter, verse: c } : { book, chapter: c, verse: d }
  return { start, end }
}

// —— Easton's Bible Dictionary (TEI) ——

/**
 * Easton's references were linked automatically, and a reference written with numbers only
 * ("27-30" after "Ex. 4:14") often got the wrong book, usually Genesis. Easton writes such a
 * reference to continue the reference before it, so that is how it is resolved here.
 */
export function convertEastonEntry(key: string, entry: XmlElement, kjv: Versification, stats: Stats): DictionaryEntry {
  if (entry.name !== 'entryFree') throw new Error(`${key}: expected <entryFree>, found <${entry.name}>`)
  let title = ''
  const blocks: ArticleBlock[] = []
  let previous: VerseRef | undefined

  for (const child of childElements(entry)) {
    if (child.name === 'title') {
      title = onlyText(child).trim()
      continue
    }
    if (child.name !== 'p') throw new Error(`${key}: unexpected <${child.name}>`)
    const inlines: ArticleInline[] = []
    for (const node of child.children) {
      if (typeof node === 'string') {
        push(inlines, node)
        continue
      }
      const text = onlyText(node)
      if (node.name === 'foreign') {
        push(inlines, { t: text, style: 'italic' })
      } else if (node.name === 'ref' && node.attributes.target) {
        push(inlines, { t: text, entry: entrySlug(node.attributes.target.replace(/^Easton:/, '')) })
      } else if (node.name === 'ref') {
        let range = bibleRef(node.attributes.osisRef, kjv, true)
        if (!/[A-Za-z]/.test(text) && range?.start.book !== previous?.book) {
          const resolved = previous && resolveBareReference(text, previous)
          range = resolved && kjv.exists(resolved) ? resolved : undefined
          if (range) stats.repaired++
        }
        if (range) {
          push(inlines, { t: text, ref: formatVerseRange(range) })
          previous = range.end ?? range.start
        } else {
          stats.unlinked++
          push(inlines, text)
        }
      } else {
        throw new Error(`${key}: unexpected <${node.name}> in a paragraph`)
      }
    }
    blocks.push({ p: tidy(inlines) })
  }
  if (!title) throw new Error(`${key}: no title`)
  return { id: entrySlug(key), title, blocks }
}

// —— Spurgeon's Morning and Evening (OSIS) ——

// Books with a single chapter, cited with the verse alone: "Jude 24" is Jude 1:24. The source
// tagged "Jude 24" as Judges 24, so these are read from the reference's text instead.
const SINGLE_CHAPTER_BOOKS: Record<string, string> = {
  Obadiah: 'Obad',
  Philemon: 'Phlm',
  '2 John': '2John',
  '3 John': '3John',
  Jude: 'Jude'
}

function devotionalRef(osisRef: string | undefined, text: string, kjv: Versification): VerseRange | undefined {
  const single = /^(.+?)\s+(\d+)$/.exec(text.trim())
  const book = single && SINGLE_CHAPTER_BOOKS[single[1]!]
  if (book) return bibleRef(`Bible:${book}.1.${single![2]}`, kjv)
  return bibleRef(osisRef, kjv, true)
}

function devotionalInlines(nodes: XmlNode[], kjv: Versification, stats: Stats, where: string): ArticleInline[] {
  const inlines: ArticleInline[] = []
  for (const node of nodes) {
    if (typeof node === 'string') {
      push(inlines, node)
    } else if (node.name === 'lb') {
      lineBreak(inlines)
    } else if (node.name === 'hi') {
      const style = { italic: 'italic', 'small-caps': 'smallCaps' }[node.attributes.type ?? ''] as 'italic' | 'smallCaps' | undefined
      if (!style) throw new Error(`${where}: unexpected <hi type="${node.attributes.type}">`)
      push(inlines, { t: onlyText(node), style })
    } else if (node.name === 'reference') {
      const range = devotionalRef(node.attributes.osisRef, onlyText(node), kjv)
      if (range) push(inlines, { t: onlyText(node), ref: formatVerseRange(range) })
      else {
        stats.unlinked++
        push(inlines, onlyText(node))
      }
    } else {
      throw new Error(`${where}: unexpected <${node.name}>`)
    }
  }
  return tidy(inlines)
}

function convertReading(section: XmlElement, kjv: Versification, stats: Stats): DevotionalReading {
  const where = section.attributes.osisID ?? '?'
  let title = ''
  const blocks: ArticleBlock[] = []
  for (const child of childElements(section)) {
    if (child.name === 'title') title = onlyText(child).trim()
    else if (child.name === 'p') blocks.push({ p: devotionalInlines(child.children, kjv, stats, where) })
    else if (child.name === 'lg') {
      blocks.push({
        poem: childElements(child).map((line) => {
          if (line.name !== 'l') throw new Error(`${where}: unexpected <${line.name}> in a poem`)
          return devotionalInlines(line.children, kjv, stats, where)
        })
      })
    } else throw new Error(`${where}: unexpected <${child.name}>`)
  }
  if (!title || !blocks.length) throw new Error(`${where}: empty reading`)
  return { title, blocks }
}

/** The passage a reading is about: the first reference of its first block, under the opening quote. */
export function keyPassage(reading: DevotionalReading): string | undefined {
  const [first] = reading.blocks
  const inlines = first ? ('p' in first ? first.p : first.poem.flat()) : []
  const ref = inlines.find((inline) => typeof inline === 'object' && 'ref' in inline)
  return ref && typeof ref === 'object' && 'ref' in ref ? ref.ref : undefined
}

export function convertDevotionalDay(key: string, entry: XmlElement, kjv: Versification, stats: Stats): DevotionalDay {
  if (!/^\d\d\.\d\d$/.test(key)) throw new Error(`Unexpected devotional key "${key}"`)
  const sections = new Map(childElements(entry, 'div').map((section) => [section.attributes.osisID ?? '', section]))
  const morning = sections.get(`${key}.am`)
  const evening = sections.get(`${key}.pm`)
  if (!morning || !evening || sections.size !== 2) throw new Error(`${key}: expected a morning and an evening reading`)
  return { id: key, morning: convertReading(morning, kjv, stats), evening: convertReading(evening, kjv, stats) }
}
