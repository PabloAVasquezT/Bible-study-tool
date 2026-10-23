// Parser for the subset of USFM (https://ubsicap.github.io/usfm/) used by our sources.
// It is deliberately strict: any marker it does not know throws, so that a new or
// updated source can never lose content silently.
import { InlineFlag, type Chapter, type Inline, type Verse, type VerseBreak, type Word } from '../../src/lib/bible.ts'
import { isBookId, type BookId } from '../../src/lib/books.ts'

export interface UsfmBook {
  id: BookId
  name: string
  abbreviation: string
  title: string
  chapters: Chapter[]
}

const HEADER_MARKERS = new Set(['id', 'h', 'toc1', 'toc2', 'toc3', 'mt1', 'mt2'])

const STYLE_FLAGS: Record<string, number> = {
  add: InlineFlag.added,
  nd: InlineFlag.divineName,
  wj: InlineFlag.wordsOfJesus
}

// A marker (\name, \+name, \name*) or a run of text up to the next marker.
const TOKEN = /\\(\+?)([a-z]+[0-9]*)(\*?)|([^\\]+)/g

interface Style {
  marker: string
  flag: number
}

interface OpenNote {
  section: 'caller' | 'fr' | 'ft'
  text: Inline[]
  styles: Style[]
}

export function parseUsfm(source: string): UsfmBook {
  const header = new Map<string, string>()
  const chapters: Chapter[] = []
  let chapter: Chapter | undefined
  let verse: Verse | undefined
  let pendingBreak: VerseBreak | undefined
  let pendingHeading: Inline[] | undefined

  let headerField: string | undefined
  let target: Inline[] | undefined
  let expectNumber: 'chapter' | 'verse' | undefined
  let skipSpace = false
  const styles: Style[] = []
  let word: string | undefined
  let note: OpenNote | undefined

  const fail = (message: string): never => {
    const id = header.get('id')?.trim().split(/\s+/)[0] ?? '?'
    throw new Error(`${message} (${id} ${chapters.length}:${chapter?.verses.length ?? 0})`)
  }

  const emit = (text: string, strong?: string): void => {
    if (note) {
      if (note.section === 'ft') append(note.text, text, strong, flagsOf(note.styles))
    } else if (headerField) {
      header.set(headerField, (header.get(headerField) ?? '') + text)
    } else if (target) {
      append(target, text, strong, flagsOf(styles))
    } else if (text.trim()) {
      fail(`Text outside of a verse: "${text.trim().slice(0, 40)}"`)
    }
  }

  const endBlock = (): void => {
    if (styles.length) fail(`Unclosed \\${styles.at(-1)!.marker} at a paragraph break`)
    headerField = undefined
    target = undefined
  }

  const finishVerse = (): void => {
    if (verse) verse.text = trimInlines(verse.text)
    verse = undefined
  }

  const finishChapter = (): void => {
    finishVerse()
    if (!chapter) return
    if (chapter.title) chapter.title = trimInlines(chapter.title)
    if (pendingHeading) chapter.subscription = trimInlines(pendingHeading)
    pendingHeading = undefined
  }

  const startChapter = (n: number): void => {
    finishChapter()
    if (n !== chapters.length + 1) fail(`Chapter ${n} is out of order`)
    chapter = { verses: [] }
    chapters.push(chapter)
  }

  const startVerse = (n: number): void => {
    if (!chapter) return fail('Verse before the first chapter')
    finishVerse()
    if (n !== chapter.verses.length + 1) fail(`Verse ${n} is out of order`)
    verse = {
      ...(pendingBreak && { break: pendingBreak }),
      ...(pendingHeading && { heading: trimInlines(pendingHeading) }),
      text: []
    }
    pendingBreak = undefined
    pendingHeading = undefined
    chapter.verses.push(verse)
    target = verse.text
  }

  const open = (name: string): void => {
    if (HEADER_MARKERS.has(name)) {
      endBlock()
      headerField = name
      return
    }
    if (name in STYLE_FLAGS) {
      ;(note ? note.styles : styles).push({ marker: name, flag: STYLE_FLAGS[name]! })
      return
    }
    switch (name) {
      case 'c':
        endBlock()
        expectNumber = 'chapter'
        return
      case 'v':
        expectNumber = 'verse'
        return
      case 'p':
        endBlock()
        pendingBreak = 'paragraph'
        return
      case 'q1':
        endBlock()
        pendingBreak = pendingBreak === 'stanza' ? 'stanza' : 'line'
        return
      case 'b':
        endBlock()
        pendingBreak = 'stanza'
        return
      case 'd':
        endBlock()
        if (!chapter) return fail('\\d before the first chapter')
        chapter.title = []
        target = chapter.title
        return
      case 's1':
        endBlock()
        if (pendingHeading) fail('Two headings in a row')
        pendingHeading = []
        target = pendingHeading
        return
      case 'tl':
        // Transliterated words (the Hebrew letters in Psalm 119) are kept as plain text.
        return
      case 'w':
        if (word !== undefined) fail('Nested \\w')
        word = ''
        return
      case 'f':
        if (note) fail('Nested \\f')
        if (!target) fail('Note outside of a verse')
        note = { section: 'caller', text: [], styles: [] }
        return
      case 'fr':
      case 'ft':
        if (!note) return fail(`\\${name} outside of a note`)
        note.section = name
        return
      default:
        fail(`Unsupported marker \\${name}`)
    }
  }

  const close = (name: string): void => {
    if (name in STYLE_FLAGS) {
      const style = (note ? note.styles : styles).pop()
      if (style?.marker !== name) fail(`Unexpected \\${name}*`)
      return
    }
    switch (name) {
      case 'w': {
        if (word === undefined) return fail('Unexpected \\w*')
        const [text = '', ...attributes] = word.split('|')
        word = undefined
        emit(text.trim(), parseStrong(attributes.join('|'), fail))
        return
      }
      case 'f': {
        if (!note || !target) return fail('Unexpected \\f*')
        if (note.styles.length) fail('Unclosed style in a note')
        target.push({ note: trimInlines(note.text) })
        note = undefined
        return
      }
      case 'tl':
        return
      default:
        fail(`Unsupported marker \\${name}*`)
    }
  }

  for (const [, , name, closing, text] of source.matchAll(TOKEN)) {
    if (name !== undefined) {
      // A space right after an opening marker belongs to the marker, not to the text.
      skipSpace = !closing
      if (closing) close(name)
      else open(name)
      continue
    }

    let rest = text!
    if (skipSpace) rest = rest.replace(/^\s/, '')
    skipSpace = false

    if (expectNumber) {
      const match = /^\s*(\d+)/.exec(rest)
      if (!match) fail(`Expected a ${expectNumber} number`)
      const n = Number(match![1])
      if (expectNumber === 'chapter') startChapter(n)
      else startVerse(n)
      expectNumber = undefined
      rest = rest.slice(match![0].length)
    }

    if (word !== undefined) word += rest
    else emit(rest)
  }

  finishChapter()
  if (word !== undefined || note || styles.length) fail('Unclosed marker at end of book')

  const value = (key: string): string | undefined => header.get(key)?.replace(/\s+/g, ' ').trim() || undefined
  const id = value('id')?.split(' ')[0] ?? ''
  if (!isBookId(id)) fail(`Unknown book id "${id}"`)
  const name = value('toc2') ?? value('h') ?? fail('Missing book name')
  return {
    id: id as BookId,
    name,
    abbreviation: value('toc3') ?? name,
    title: value('toc1') ?? value('mt1') ?? name,
    chapters
  }
}

function flagsOf(styles: Style[]): number {
  return styles.reduce((flags, style) => flags | style.flag, 0)
}

/** Normalizes `strong="H0430"` to `H430`. */
function parseStrong(attributes: string, fail: (message: string) => never): string | undefined {
  const value = /\bstrong="([^"]*)"/.exec(attributes)?.[1]
  if (value === undefined) return undefined
  const match = /^([HG])0*(\d+)$/.exec(value)
  if (!match) fail(`Unsupported Strong's number "${value}"`)
  return match![1]! + match![2]!
}

/** Appends text, merging it with the previous run when they have the same style. */
function append(list: Inline[], raw: string, strong: string | undefined, flags: number): void {
  const text = raw.replace(/\s+/g, ' ')
  if (!text) return
  const last = list.at(-1)

  // Whitespace carries no style, and plain text is stored as a bare string.
  if (strong === undefined && (flags === 0 || !text.trim())) {
    if (typeof last === 'string') list[list.length - 1] = (last + text).replace(/ {2,}/g, ' ')
    else list.push(text)
    return
  }
  if (strong === undefined && isWord(last) && last.s === undefined && last.f === flags) {
    last.t = (last.t + text).replace(/ {2,}/g, ' ')
    return
  }

  const run: Word = { t: text }
  if (strong !== undefined) run.s = strong
  if (flags) run.f = flags
  list.push(run)
}

function isWord(inline: Inline | undefined): inline is Word {
  return typeof inline === 'object' && 't' in inline
}

/** Removes leading and trailing whitespace, including around notes at the end. */
function trimInlines(list: Inline[]): Inline[] {
  const result = [...list]
  while (typeof result[0] === 'string') {
    const text = result[0].trimStart()
    if (text) {
      result[0] = text
      break
    }
    result.shift()
  }
  for (let i = result.length - 1; i >= 0; i--) {
    const item = result[i]!
    if (typeof item === 'string') {
      const text = item.trimEnd()
      if (text) {
        result[i] = text
        break
      }
      result.splice(i, 1)
    } else if (!('note' in item)) {
      break
    }
  }
  return result
}
