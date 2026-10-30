import { useEffect, useRef } from 'react'
import type { Chapter, Inline, Verse } from '../lib/bible.ts'
import { Link } from '../router.tsx'
import { Inlines } from './Inlines.tsx'

interface ChapterViewProps {
  /** Identifies the chapter, to know when to scroll back to the top. */
  chapterKey: string
  bookName: string
  number: number
  chapter: Chapter
  selectedVerse?: number
  verseHref: (verse: number) => string
  /** Called when a verse number is tapped. */
  onVerseSelect: (verse: number) => void
  showStrong: boolean
}

type Line = { number: number; verse: Verse }[]

type TextBlock = { kind: 'prose' | 'poetry'; lines: Line[] }

type Block = { kind: 'heading'; heading: Inline[] } | TextBlock

/** Groups verses into paragraphs and poetry stanzas, following each verse's break. */
function toBlocks(verses: Verse[]): Block[] {
  const blocks: Block[] = []
  verses.forEach((verse, index) => {
    // Empty verses are versification placeholders: their text is numbered elsewhere in this Bible.
    if (!verse.text.length && !verse.heading) return
    if (verse.heading) blocks.push({ kind: 'heading', heading: verse.heading })
    const last = blocks.at(-1)
    let block: TextBlock
    if (last && last.kind !== 'heading' && (!verse.break || (verse.break === 'line' && last.kind === 'poetry'))) {
      block = last
      if (verse.break === 'line') block.lines.push([])
    } else {
      block = { kind: verse.break === 'line' || verse.break === 'stanza' ? 'poetry' : 'prose', lines: [[]] }
      blocks.push(block)
    }
    block.lines.at(-1)!.push({ number: index + 1, verse })
  })
  return blocks
}

export function ChapterView({
  chapterKey,
  bookName,
  number,
  chapter,
  selectedVerse,
  verseHref,
  onVerseSelect,
  showStrong
}: ChapterViewProps) {
  const shownKey = useRef<string>(undefined)

  // Scroll when arriving at a chapter, but not when a verse of the same chapter is selected.
  useEffect(() => {
    if (shownKey.current === chapterKey) return
    shownKey.current = chapterKey
    const target = selectedVerse && document.getElementById(`v${selectedVerse}`)
    if (target) target.scrollIntoView({ block: 'center' })
    else window.scrollTo({ top: 0 })
  }, [chapterKey, selectedVerse])

  const renderLine = (line: Line) =>
    line.map(({ number: n, verse }) => (
      <span key={n} id={`v${n}`} className={n === selectedVerse ? 'verse-selected' : undefined}>
        <Link
          to={verseHref(n)}
          replace
          onClick={() => onVerseSelect(n)}
          className="verse-number"
          aria-label={`Verse ${n}: study this verse`}
        >
          {n}
        </Link>
        <Inlines inlines={verse.text} showStrong={showStrong} />{' '}
      </span>
    ))

  return (
    <article className="font-serif text-[1.1875rem] leading-[1.8] sm:text-xl">
      <header className="mb-8 text-center">
        <p className="font-sans text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase">{bookName}</p>
        <h1 className="text-5xl leading-tight">{number}</h1>
      </header>

      {chapter.title && (
        <p className="mb-5 text-base text-ink-muted italic">
          <Inlines inlines={chapter.title} showStrong={showStrong} />
        </p>
      )}

      {toBlocks(chapter.verses).map((block, index) => {
        if (block.kind === 'heading') {
          return (
            <h2 key={index} className="mt-8 mb-2 font-sans text-sm font-semibold tracking-wide text-ink-muted">
              <Inlines inlines={block.heading} showStrong={showStrong} />
            </h2>
          )
        }
        if (block.kind === 'prose') {
          return (
            <p key={index} className="mb-5">
              {block.lines.map(renderLine)}
            </p>
          )
        }
        return (
          <div key={index} className="mb-5">
            {block.lines.map((line, lineIndex) => (
              <p key={lineIndex} className="pl-6 -indent-6">
                {renderLine(line)}
              </p>
            ))}
          </div>
        )
      })}

      {chapter.subscription && (
        <p className="mt-8 text-center text-base text-ink-muted italic">
          <Inlines inlines={chapter.subscription} showStrong={showStrong} />
        </p>
      )}
    </article>
  )
}
