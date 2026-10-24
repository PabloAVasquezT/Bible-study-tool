import { Suspense, useEffect, type ReactNode } from 'react'
import { CreditsPage } from './CreditsPage.tsx'
import { parsePassagePath, parseSearchPath } from './lib/passage.ts'
import { ErrorBoundary, ErrorPage, LoadingPage, NotFoundPage } from './pages.tsx'
import { readPreference } from './preferences.ts'
import { ReaderPage } from './ReaderPage.tsx'
import { navigate, usePath } from './router.tsx'
import { SearchPage } from './SearchPage.tsx'

const DEFAULT_PATH = '/kjv/gen/1'

export function App() {
  const path = usePath()
  const [pathname = '/', search = ''] = path.split('?')

  if (pathname === '/') {
    const last = readPreference('lastPassage', DEFAULT_PATH)
    return <Redirect to={parsePassagePath(last) ? last : DEFAULT_PATH} />
  }

  let page: ReactNode
  const passage = parsePassagePath(pathname)
  const searchBible = parseSearchPath(pathname)
  if (passage) page = <ReaderPage passage={passage} />
  else if (searchBible) page = <SearchPage bible={searchBible} query={new URLSearchParams(search).get('q') ?? ''} />
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
