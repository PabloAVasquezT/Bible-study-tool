import { use, useEffect, type ReactNode } from 'react'
import { ArrowLeft } from './components/icons/index.tsx'
import { loadBibleInfo, loadBibles, loadLexicons } from './data.ts'
import { Link } from './router.tsx'

const REPOSITORY = 'https://github.com/PabloAVasquezT/Bible-study-tool'

/** Every bundled source and its license. CC BY sources require this attribution. */
export function CreditsPage() {
  // use() may be called in a loop, unlike hooks.
  const bibles = use(loadBibles()).map((bible) => use(loadBibleInfo(bible.id)))
  const lexicons = use(loadLexicons())

  useEffect(() => {
    document.title = 'Credits · Bible Study Tool'
    document.documentElement.lang = 'en'
  }, [])

  return (
    <div className="min-h-dvh pb-[env(safe-area-inset-bottom)]">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-2">
          <Link to="/" className="icon-button" aria-label="Back to the reader">
            <ArrowLeft />
          </Link>
          <h1 className="font-semibold">Credits</h1>
        </div>
      </header>

      <main className="mx-auto max-w-prose px-5 pt-8 pb-12 leading-relaxed">
        <p className="text-ink-muted">
          Bible Study Tool is free to use and share for any noncommercial purpose. Its code is licensed under the{' '}
          <ExternalLink href={`${REPOSITORY}/blob/main/LICENSE`}>PolyForm Noncommercial License 1.0.0</ExternalLink> and is available
          on <ExternalLink href={REPOSITORY}>GitHub</ExternalLink>. The texts below keep their own licenses.
        </p>

        <Section title="Bibles">
          {bibles.map((bible) => (
            <Credit key={bible.id} name={`${bible.name} (${bible.abbreviation})`}>
              {bible.license}. From <ExternalLink href={bible.source.url}>{bible.source.name}</ExternalLink>, converted from USFM to JSON.
            </Credit>
          ))}
        </Section>

        <Section title="Dictionaries">
          {lexicons.map((lexicon) => (
            <Credit key={lexicon.id} name={lexicon.name}>
              {lexicon.attribution && <>By the {lexicon.attribution}. </>}
              From <ExternalLink href={lexicon.source.url}>{lexicon.source.name}</ExternalLink>, licensed under{' '}
              {lexicon.licenseUrl ? <ExternalLink href={lexicon.licenseUrl}>{lexicon.license}</ExternalLink> : lexicon.license}.{' '}
              {lexicon.changes}
            </Credit>
          ))}
        </Section>

        <Section title="Fonts and icons">
          <Credit name="Inter and Literata">
            By the <ExternalLink href="https://github.com/rsms/inter">Inter</ExternalLink> and{' '}
            <ExternalLink href="https://github.com/googlefonts/literata">Literata</ExternalLink> project authors, licensed under the{' '}
            <ExternalLink href="https://openfontlicense.org">SIL Open Font License 1.1</ExternalLink>.
          </Credit>
          <Credit name="Lucide icons">
            By <ExternalLink href="https://lucide.dev">Lucide</ExternalLink> contributors, licensed under ISC; the icons derived from
            Feather, by Cole Bemis, under MIT.
          </Credit>
        </Section>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-xs font-semibold tracking-[0.15em] text-ink-muted uppercase">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Credit({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold">{name}</h3>
      <p className="text-sm text-ink-muted">{children}</p>
    </div>
  )
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-accent underline-offset-2 hover:underline">
      {children}
    </a>
  )
}
