# Bible Study Tool

A free Bible study app for the web. It runs entirely in the browser: there is no backend and nothing to install, and it is designed for phones as well as desktops.

> **Status:** early development. The project setup is in place; the reader and the data are next.

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
| Strong's Hebrew dictionary | [openscriptures/HebrewLexicon](https://github.com/openscriptures/HebrewLexicon) | CC BY 4.0 |
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
```

### Tech stack

React 19, TypeScript, Vite and Tailwind CSS 4. Dependencies are kept to a minimum on purpose: routing, storage, the service worker and data parsing are small pieces of our own code rather than libraries.
