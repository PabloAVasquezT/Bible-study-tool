import { Suspense, useEffect, type ReactNode } from 'react'
import { CreditsPage } from './CreditsPage.tsx'
import { DictionaryEntryPage, DictionaryPage } from './DictionaryPage.tsx'
import { dictionaryPath, parseDictionaryPath, parsePassagePath, parseSearchPath } from './lib/passage.ts'
import { ErrorBoundary, ErrorPage, LoadingPage, NotFoundPage } from './pages.tsx'
import { lastPassage } from './preferences.ts'
import { ReaderPage } from './ReaderPage.tsx'
import { navigate, usePath } from './router.tsx'
import { SearchPage } from './SearchPage.tsx'

// Short paths for the sections that have only one source so far.
const REDIRECTS: Record<string, () => string> = {
  '/': lastPassage,
  '/dictionary': () => dictionaryPath('easton')
}

export function App() {
  const path = usePath()
  const [pathname = '/', search = ''] = path.split('?')

  const redirect = REDIRECTS[pathname.replace(/(.)\/$/, '$1')]
  if (redirect) return <Redirect to={redirect()} />

  let page: ReactNode
  const passage = parsePassagePath(pathname)
  const searchBible = parseSearchPath(pathname)
  const dictionary = parseDictionaryPath(pathname)
  if (passage) page = <ReaderPage passage={passage} />
  else if (searchBible) page = <SearchPage bible={searchBible} query={new URLSearchParams(search).get('q') ?? ''} />
  else if (dictionary?.entry) page = <DictionaryEntryPage dictionary={dictionary.dictionary} entry={dictionary.entry} />
  else if (dictionary) page = <DictionaryPage dictionary={dictionary.dictionary} />
  else if (pathname === '/credits') page = <CreditsPage />
  else return <NotFoundPage />

  return (
    <ErrorBoundary resetKey={path} fallback={(error) => <ErrorPage error={error} />}>
      <Suspense fallback={<LoadingPage />}>{page}</Suspense>
    </ErrorBoundary>
  )
}

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, { replace: true }), [to])
  return null
}
