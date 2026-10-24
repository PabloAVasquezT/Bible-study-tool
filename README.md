# Bible Study Tool

A free Bible study app for the web. It runs entirely in the browser: there is no backend and nothing to install, and it is designed for phones as well as desktops.

> **Status:** early development. You can read the KJV and the Reina-Valera 1909, look up Strong's numbers in the Greek and Hebrew dictionaries, and follow cross-references from any verse.

## Goals

- Read the Bible with translator italics, Strong's numbers and cross-references.
- Tap a Strong's number to open the Greek or Hebrew lexicon entry.
- Search the full text.
- Keep personal notes and bookmarks, stored only in your browser.
- Work offline once loaded, and be installable as an app.

## Content and licenses

The app's code is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE): you may use, share and modify it for free, but not for any commercial purpose.

All bundled texts come from openly licensed sources and keep their own licenses, which the code license does not change:

| Content | Source | License |
|---|---|---|
| King James Version with Strong's numbers | [eBible.org (eng-kjv2006)](https://ebible.org/find/details.php?id=eng-kjv2006) | Public domain |
| Reina-Valera 1909 | [eBible.org (spaRV1909)](https://ebible.org/find/details.php?id=spaRV1909) | Public domain |
| Strong's Greek dictionary | [morphgnt/strongs-dictionary-xml](https://github.com/morphgnt/strongs-dictionary-xml) | CC0 1.0 |
| Strong's Hebrew dictionary, by the Open Scriptures Hebrew Bible Project | [openscriptures/HebrewLexicon](https://github.com/openscriptures/HebrewLexicon) | CC BY 4.0 |
| Cross-references (based on the Treasury of Scripture Knowledge) | [OpenBible.info](https://www.openbible.info/labs/cross-references/) | CC BY 4.0 |

The fonts [Inter](https://github.com/rsms/inter) and [Literata](https://github.com/googlefonts/literata) are bundled under the SIL Open Font License 1.1 (see `src/assets/fonts/*/OFL.txt`).

This project is inspired by the classic Online Bible desktop program, but it is not affiliated with it and contains none of its code or data.

## Development

Requires Node.js 24 or later.

```sh
npm install
npm run dev        # start the dev server
npm run build      # production build in dist/
npm run preview    # serve the production build
npm run typecheck  # type-check the app and the scripts
npm test           # run the tests (node:test)
npm run data:bibles    # regenerate public/data/bibles/ from the upstream sources
npm run data:lexicons  # regenerate public/data/lexicons/
npm run data:crossrefs # regenerate public/data/crossrefs/ (after data:bibles)
```

The generated data is committed, so you only need to regenerate it when a source or the converter changes. See [docs/data-format.md](docs/data-format.md) for the file layout.

### Deployment

The app is a set of static files. The [`Dockerfile`](Dockerfile) checks and builds it, then serves `dist/` with nginx on port 80:

```sh
docker build -t bible-study-tool .
docker run --rm -p 8080:80 bible-study-tool   # http://localhost:8080
```

The nginx configuration in [`docker/`](docker/) sends every app route (such as `/kjv/jhn/3/16`) to `index.html`, serves precompressed files, caches hashed assets for a year and revalidates the Bible data on each visit.

### Tech stack

React 19, TypeScript, Vite and Tailwind CSS 4. Dependencies are kept to a minimum on purpose: routing, storage, the service worker and data parsing are small pieces of our own code rather than libraries.
