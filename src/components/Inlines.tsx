import { Fragment, useId } from 'react'
import { InlineFlag, type Inline, type Word } from '../lib/bible.ts'

interface InlinesProps {
  inlines: Inline[]
  showStrong: boolean
}

export function Inlines({ inlines, showStrong }: InlinesProps) {
  return inlines.map((inline, index) => {
    if (typeof inline === 'string') return <Fragment key={index}>{inline}</Fragment>
    if ('note' in inline) return <NoteMarker key={index} note={inline.note} showStrong={showStrong} />
    return <WordView key={index} word={inline} showStrong={showStrong} />
  })
}

function WordView({ word, showStrong }: { word: Word; showStrong: boolean }) {
  const flags = word.f ?? 0
  const className = [flags & InlineFlag.added && 'italic', flags & InlineFlag.wordsOfJesus && 'text-jesus']
    .filter(Boolean)
    .join(' ')
  return (
    <span className={className || undefined}>
      {flags & InlineFlag.divineName ? <DivineName text={word.t} /> : word.t}
      {showStrong && word.s && <sup className="strong-number">{word.s}</sup>}
    </span>
  )
}

/** "LORD" is printed as a capital L followed by small capitals. */
function DivineName({ text }: { text: string }) {
  if (text !== text.toUpperCase()) return <span className="small-caps">{text}</span>
  return (
    <>
      {text[0]}
      <span className="all-small-caps">{text.slice(1)}</span>
    </>
  )
}

function NoteMarker({ note, showStrong }: { note: Inline[]; showStrong: boolean }) {
  const id = useId()
  return (
    <>
      <button type="button" popoverTarget={id} className="note-marker" aria-label="Show note">
        *
      </button>
      <span id={id} popover="auto" className="note-popover">
        <Inlines inlines={note} showStrong={showStrong} />
      </span>
    </>
  )
}
