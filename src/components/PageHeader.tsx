import type { ReactNode } from 'react'
import { Link } from '../router.tsx'
import { ArrowLeft } from './icons/index.tsx'

interface PageHeaderProps {
  title: string
  /** Where the back arrow goes; no arrow when unset. */
  back?: { to: string; label: string }
  /** Shown at the right end. */
  children?: ReactNode
}

export function PageHeader({ title, back, children }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-canvas/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-2">
        {back ? (
          <Link to={back.to} className="icon-button" aria-label={back.label}>
            <ArrowLeft />
          </Link>
        ) : (
          <span className="w-2" />
        )}
        <h1 className="min-w-0 flex-1 truncate font-semibold">{title}</h1>
        {children}
      </div>
    </header>
  )
}
