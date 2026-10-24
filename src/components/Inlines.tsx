import { createContext, Fragment, use, useId } from 'react'
import { InlineFlag, type Inline, type Word } from '../lib/bible.ts'

/** Opens the lexicon entry for a Strong's number. */
export const OpenStrongContext = createContext<(strong: string) => void>(() => {})

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
  const openStrong = use(OpenStrongContext)
  const flags = word.f ?? 0
  const className = [flags & InlineFlag.added && 'italic', flags & InlineFlag.wordsOfJesus && 'text-jesus']
    .filter(Boolean)
    .join(' ')
  const text = (part: string) => (flags & InlineFlag.divineName ? <DivineName text={part} /> : part)
  if (!showStrong || !word.s) return <span className={className || undefined}>{text(word.t)}</span>

  // Keep the last word and its numbers together, so a number never starts a line on its own.
  const split = word.t.lastIndexOf(' ') + 1
  return (
    <span className={className || undefined}>
      {split > 0 && text(word.t.slice(0, split))}
      <span className="whitespace-nowrap">
        {text(word.t.slice(split))}
        {word.s.split(' ').map((strong) => (
          <button
            key={strong}
            type="button"
            onClick={() => openStrong(strong)}
            className="strong-number"
            aria-label={`Strong's ${strong}`}
          >
            {strong}
          </button>
        ))}
      </span>
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
