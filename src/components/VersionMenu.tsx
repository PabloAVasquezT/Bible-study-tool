import { useId, useRef } from 'react'
import type { BibleSummary } from '../lib/bible.ts'
import { Link } from '../router.tsx'
import { ChevronDown } from './icons/index.tsx'

const languageNames = new Intl.DisplayNames(['en'], { type: 'language' })

interface VersionMenuProps {
  bibles: BibleSummary[]
  current: BibleSummary
  /** The same passage in another Bible. */
  hrefFor: (bible: string) => string
}

export function VersionMenu({ bibles, current, hrefFor }: VersionMenuProps) {
  const id = useId()
  const menu = useRef<HTMLDivElement>(null)

  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        title="Change Bible version"
        className="flex shrink-0 items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-ink-muted hover:bg-sunken hover:text-ink"
      >
        {current.abbreviation}
        <ChevronDown width={14} height={14} />
      </button>
      <div id={id} ref={menu} popover="auto" className="menu-popover">
        <h2 className="px-3 pt-1 pb-2 text-xs font-semibold tracking-[0.15em] text-ink-muted uppercase">Bible version</h2>
        {bibles.map((bible) => (
          <Link
            key={bible.id}
            to={hrefFor(bible.id)}
            onClick={() => menu.current?.hidePopover()}
            aria-current={bible.id === current.id || undefined}
            className={`flex items-baseline justify-between gap-4 rounded-lg px-3 py-2.5 ${bible.id === current.id ? 'bg-accent-soft text-accent' : 'hover:bg-sunken'}`}
          >
            <span className="font-medium">{bible.name}</span>
            <span className="text-xs text-ink-muted">
              {bible.abbreviation} · {languageNames.of(bible.language)}
            </span>
          </Link>
        ))}
      </div>
    </>
  )
}
