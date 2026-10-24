import { use, useEffect, useState } from 'react'
import { ChapterView } from './components/ChapterView.tsx'
import { ArrowLeft, ArrowRight } from './components/icons/index.tsx'
import { OpenStrongContext } from './components/Inlines.tsx'
import { LexiconPanel } from './components/LexiconPanel.tsx'
import { PassagePicker } from './components/PassagePicker.tsx'
import { TopBar } from './components/TopBar.tsx'
import { loadBibleInfo, loadBibles, loadBook } from './data.ts'
import { adjacentChapter, passagePath, type ChapterRef, type Passage } from './lib/passage.ts'
import { NotFoundPage } from './pages.tsx'
import { usePreference, writePreference } from './preferences.ts'
import { Link, navigate } from './router.tsx'

export function ReaderPage({ passage }: { passage: Passage }) {
  const bibles = use(loadBibles())
  const info = use(loadBibleInfo(passage.bible))
  const book = use(loadBook(passage.bible, passage.book))
  const [showStrong, setShowStrong] = usePreference('showStrong', false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [strong, setStrong] = useState<string>()

  const bookInfo = info.books.find((b) => b.id === passage.book)
  const chapter = book.chapters[passage.chapter - 1]
  const valid = bookInfo && chapter && (passage.verse === undefined || passage.verse <= chapter.verses.length)

  const pathOf = ({ book, chapter }: ChapterRef): string => passagePath({ bible: passage.bible, book, chapter })
  const previous = adjacentChapter(info.books, passage, -1)
  const next = adjacentChapter(info.books, passage, 1)
  const label = `${bookInfo?.name ?? passage.book} ${passage.chapter}`

  useEffect(() => {
    if (!valid) return
    document.title = `${label} (${info.abbreviation}) · Bible Study Tool`
    // Lets the browser pick the right hyphenation, quotes and voice for the text.
    document.documentElement.lang = info.language
    writePreference('lastPassage', pathOf(passage))
  })

  // Arrow keys move between chapters on keyboards.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (pickerOpen || strong || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      const target = event.key === 'ArrowLeft' ? previous : event.key === 'ArrowRight' ? next : undefined
      if (target) navigate(pathOf(target))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  if (!valid) return <NotFoundPage />

  const nameOf = (ref: ChapterRef): string =>
    `${info.books.find((b) => b.id === ref.book)?.name ?? ref.book} ${ref.chapter}`

  return (
    <div className="min-h-dvh pb-[env(safe-area-inset-bottom)]">
      <TopBar
        label={label}
        bibles={bibles}
        bible={info}
        versionHref={(bible) => passagePath({ ...passage, bible })}
        previousHref={previous && pathOf(previous)}
        nextHref={next && pathOf(next)}
        showStrong={showStrong}
        onToggleStrong={() => setShowStrong(!showStrong)}
        onOpenPicker={() => setPickerOpen(true)}
      />

      <main className="mx-auto max-w-prose px-5 pt-8 pb-12">
        <OpenStrongContext value={setStrong}>
          <ChapterView
            chapterKey={pathOf(passage)}
            bookName={bookInfo.name}
            number={passage.chapter}
            chapter={chapter}
            selectedVerse={passage.verse}
            verseHref={(verse) => passagePath({ ...passage, verse })}
            showStrong={showStrong}
          />
        </OpenStrongContext>

        <nav className="mt-10 grid grid-cols-2 gap-3 font-sans text-sm" aria-label="Chapters">
          {previous ? (
            <Link to={pathOf(previous)} className="chapter-nav">
              <ArrowLeft width={16} height={16} />
              <span className="truncate">{nameOf(previous)}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={pathOf(next)} className="chapter-nav justify-end text-right">
              <span className="truncate">{nameOf(next)}</span>
              <ArrowRight width={16} height={16} />
            </Link>
          )}
        </nav>

        <p className="mt-8 text-center font-sans text-xs text-ink-faint">
          <Link to="/credits" className="underline-offset-2 hover:text-ink-muted hover:underline">
            Credits and licenses
          </Link>
        </p>
      </main>

      <LexiconPanel strong={strong} onClose={() => setStrong(undefined)} />

      <PassagePicker
        open={pickerOpen}
        info={info}
        current={passage}
        onSelect={(ref) => {
          setPickerOpen(false)
          navigate(pathOf(ref))
        }}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  )
}
