export function App() {
  return (
    <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <header className="border-b border-line bg-surface px-4 py-3">
        <h1 className="text-base font-semibold tracking-tight">Bible Study Tool</h1>
      </header>
      <main className="mx-auto flex w-full max-w-prose flex-1 flex-col justify-center gap-3 px-4 py-10">
        <p className="font-serif text-2xl leading-snug">
          In the beginning was the Word, and the Word was with God, and the Word was God.
        </p>
        <p className="text-sm text-ink-muted">John 1:1 · KJV</p>
        <p className="mt-6 text-sm text-ink-faint">Work in progress — the reader is coming soon.</p>
      </main>
    </div>
  )
}
