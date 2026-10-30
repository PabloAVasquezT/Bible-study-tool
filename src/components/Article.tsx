import { Fragment } from 'react'
import type { ArticleBlock, ArticleInline } from '../lib/articles.ts'
import { parseVerseRange } from '../lib/crossrefs.ts'
import { dictionaryPath, passagePath } from '../lib/passage.ts'
import { readingBible } from '../preferences.ts'
import { Link } from '../router.tsx'

interface ArticleBodyProps {
  blocks: ArticleBlock[]
  /** The dictionary that entry links point into. */
  dictionary?: string
  /** Called when a link is followed, e.g. to close the sheet the article is in. */
  onNavigate?: () => void
}

/** A dictionary entry or devotional reading. Bible references open in the Bible being read. */
export function ArticleBody({ blocks, dictionary, onNavigate }: ArticleBodyProps) {
  const bible = readingBible()
  const inline = (item: ArticleInline, index: number) => {
    if (typeof item === 'string') return <Fragment key={index}>{item}</Fragment>
    if ('style' in item) {
      return item.style === 'italic' ? <em key={index}>{item.t}</em> : <span key={index} className="small-caps">{item.t}</span>
    }
    if ('ref' in item) {
      const range = parseVerseRange(item.ref)
      if (!range) return <Fragment key={index}>{item.t}</Fragment>
      return (
        <Link key={index} to={passagePath({ bible, ...range.start })} onClick={onNavigate} className="article-link">
          {item.t}
        </Link>
      )
    }
    if (!dictionary) return <Fragment key={index}>{item.t}</Fragment>
    return (
      <Link key={index} to={dictionaryPath(dictionary, item.entry)} onClick={onNavigate} className="article-link small-caps">
        {item.t.toLowerCase()}
      </Link>
    )
  }

  return (
    <div className="font-serif text-[1.0625rem] leading-relaxed sm:text-lg">
      {blocks.map((block, index) =>
        'p' in block ? (
          <p key={index} className="mb-4 whitespace-pre-line">
            {block.p.map(inline)}
          </p>
        ) : (
          <div key={index} className="mb-4 pl-6 text-ink-muted italic">
            {block.poem.map((line, lineIndex) => (
              <p key={lineIndex}>{line.map(inline)}</p>
            ))}
          </div>
        )
      )}
    </div>
  )
}
