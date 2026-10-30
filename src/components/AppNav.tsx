import type { ReactNode } from 'react'
import { dictionaryPath, searchPath } from '../lib/passage.ts'
import { readingBible } from '../preferences.ts'
import { Link } from '../router.tsx'
import { BookOpen, Library, Search } from './icons/index.tsx'

export type Section = 'bible' | 'search' | 'dictionary'

/** The app's sections, at the bottom of the screen where a thumb reaches them. */
export function AppNav({ current }: { current?: Section }) {
  return (
    <>
      {/* Keeps the end of the page clear of the bar. */}
      <div className="h-[calc(4rem+env(safe-area-inset-bottom))]" aria-hidden="true" />
      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-3">
          <Item to="/" label="Bible" current={current === 'bible'} icon={<BookOpen />} />
          <Item to={searchPath(readingBible())} label="Search" current={current === 'search'} icon={<Search />} />
          <Item to={dictionaryPath('easton')} label="Dictionary" current={current === 'dictionary'} icon={<Library />} />
        </div>
      </nav>
    </>
  )
}

function Item({ to, label, current, icon }: { to: string; label: string; current: boolean; icon: ReactNode }) {
  return (
    <Link
      to={to}
      aria-current={current ? 'page' : undefined}
      className={`flex flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-medium ${current ? 'text-accent' : 'text-ink-muted hover:text-ink'}`}
    >
      {icon}
      {label}
    </Link>
  )
}
