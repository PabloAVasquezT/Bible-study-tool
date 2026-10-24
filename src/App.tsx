import { Suspense, useEffect } from 'react'
import { CreditsPage } from './CreditsPage.tsx'
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
  if (!passage && path !== '/credits') return <NotFoundPage />

  return (
    <ErrorBoundary resetKey={path} fallback={(error) => <ErrorPage error={error} />}>
      <Suspense fallback={<LoadingPage />}>{passage ? <ReaderPage passage={passage} /> : <CreditsPage />}</Suspense>
    </ErrorBoundary>
  )
}

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, { replace: true }), [to])
  return null
}
