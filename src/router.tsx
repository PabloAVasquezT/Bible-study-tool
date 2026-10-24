// A tiny router on top of the History API: the app only needs the current path and query.
import { startTransition, useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from 'react'

const listeners = new Set<() => void>()

const currentPath = (): string => location.pathname + location.search

export function navigate(to: string, { replace = false } = {}): void {
  if (to === currentPath()) return
  if (replace) history.replaceState(null, '', to)
  else history.pushState(null, '', to)
  for (const listener of listeners) listener()
}

/**
 * The current path with its query string, e.g. "/kjv/search?q=love". Updates are
 * transitions, so the old page stays up while the next one loads.
 */
export function usePath(): string {
  const [path, setPath] = useState(currentPath)
  useEffect(() => {
    const update = (): void => startTransition(() => setPath(currentPath()))
    listeners.add(update)
    window.addEventListener('popstate', update)
    // Child effects run first, so a child may have navigated before this listener existed.
    update()
    return () => {
      listeners.delete(update)
      window.removeEventListener('popstate', update)
    }
  }, [])
  return path
}

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string
  replace?: boolean
}

export function Link({ to, replace, onClick, ...props }: LinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    onClick?.(event)
    // Let the browser handle new-tab clicks and other modified clicks.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }
    event.preventDefault()
    navigate(to, { replace })
  }
  return <a href={to} onClick={handleClick} {...props} />
}
