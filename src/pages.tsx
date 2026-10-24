import { Component, type ReactNode } from 'react'
import { Link } from './router.tsx'

function Message({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-prose flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="font-serif text-3xl">{title}</h1>
      {children}
    </main>
  )
}

export function NotFoundPage() {
  return (
    <Message title="Passage not found">
      <p className="text-ink-muted">This address does not point to a passage in this Bible.</p>
      <Link to="/" className="font-semibold text-accent underline-offset-4 hover:underline">
        Go to the reader
      </Link>
    </Message>
  )
}

export function ErrorPage({ error }: { error: Error }) {
  return (
    <Message title="Something went wrong">
      <p className="text-ink-muted">{error.message}</p>
      <button type="button" onClick={() => location.reload()} className="font-semibold text-accent">
        Try again
      </button>
    </Message>
  )
}

export function LoadingPage() {
  return (
    <div className="mx-auto max-w-prose animate-pulse px-5 pt-24" aria-label="Loading">
      <div className="mx-auto mb-10 h-12 w-16 rounded-lg bg-sunken" />
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="mb-4 h-4 rounded bg-sunken" style={{ width: `${70 + ((i * 37) % 30)}%` }} />
      ))}
    </div>
  )
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback: (error: Error) => ReactNode
  /** Clears the error when it changes, e.g. on navigation. */
  resetKey: string
}

interface ErrorBoundaryState {
  error?: Error
  resetKey: string
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { resetKey: this.props.resetKey }

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  static getDerivedStateFromProps(props: ErrorBoundaryProps, state: ErrorBoundaryState): Partial<ErrorBoundaryState> | null {
    return props.resetKey === state.resetKey ? null : { error: undefined, resetKey: props.resetKey }
  }

  render() {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children
  }
}
