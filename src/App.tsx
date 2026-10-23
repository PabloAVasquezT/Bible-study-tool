import { Suspense, useEffect } from 'react'
import { parsePassagePath } from './lib/passage.ts'
import { ErrorBoundary, ErrorPage, LoadingPage, NotFoundPage } from './pages.tsx'
import { readPreference } from './preferences.ts'
import { ReaderPage } from './ReaderPage.tsx'
import { navigate, usePath } from './router.tsx'

const DEFAULT_PATH = '/kjv/gen/1'

export function App() {
  const path = usePath()

  if (path === '/') {
    const last = readPreference('lastPassage', DEFAULT_PATH)
    return <Redirect to={parsePassagePath(last) ? last : DEFAULT_PATH} />
  }

  const passage = parsePassagePath(path)
  if (!passage) return <NotFoundPage />

  return (
    <ErrorBoundary key={`${passage.bible}/${passage.book}`} fallback={(error) => <ErrorPage error={error} />}>
      <Suspense fallback={<LoadingPage />}>
        <ReaderPage passage={passage} />
      </Suspense>
    </ErrorBoundary>
  )
}

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, { replace: true }), [to])
  return null
}
