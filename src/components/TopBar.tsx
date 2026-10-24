import type { ReactNode } from 'react'
import type { BibleSummary } from '../lib/bible.ts'
import { Link } from '../router.tsx'
import { ChevronDown, ChevronLeft, ChevronRight, Search } from './icons/index.tsx'
import { VersionMenu } from './VersionMenu.tsx'

interface TopBarProps {
  label: string
  bibles: BibleSummary[]
  bible: BibleSummary
  versionHref: (bible: string) => string
  searchHref: string
  previousHref?: string
  nextHref?: string
  showStrong: boolean
  onToggleStrong: () => void
  onOpenPicker: () => void
}

export function TopBar({
  label,
  bibles,
  bible,
  versionHref,
  searchHref,
  previousHref,
  nextHref,
  showStrong,
  onToggleStrong,
  onOpenPicker
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-canvas/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-2">
        <ChapterLink href={previousHref} label="Previous chapter">
          <ChevronLeft />
        </ChapterLink>

        <div className="mx-auto flex min-w-0 items-center">
          <button
            type="button"
            onClick={onOpenPicker}
            className="flex min-w-0 items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-sunken"
          >
            <span className="truncate font-semibold">{label}</span>
            <ChevronDown className="shrink-0 text-ink-muted" width={16} height={16} />
          </button>
          <VersionMenu bibles={bibles} current={bible} hrefFor={versionHref} />
        </div>

        <Link to={searchHref} className="icon-button" aria-label="Search" title="Search (/)">
          <Search />
        </Link>

        <button
          type="button"
          onClick={onToggleStrong}
          aria-pressed={showStrong}
          title="Show Strong's numbers"
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${showStrong ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink-muted hover:bg-sunken'}`}
        >
          Strong's
        </button>

        <ChapterLink href={nextHref} label="Next chapter">
          <ChevronRight />
        </ChapterLink>
      </div>
    </header>
  )
}

function ChapterLink({ href, label, children }: { href?: string; label: string; children: ReactNode }) {
  if (!href) {
    return (
      <span className="icon-button opacity-30" aria-hidden="true">
        {children}
      </span>
    )
  }
  return (
    <Link to={href} className="icon-button" aria-label={label} title={label}>
      {children}
    </Link>
  )
}
