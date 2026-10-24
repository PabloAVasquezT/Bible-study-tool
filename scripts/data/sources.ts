// Upstream files the data is generated from. Each one is pinned by its SHA-256 so a
// rebuild never silently picks up a changed upstream file: when a hash stops matching,
// review what changed upstream, then update the hash here.

export interface Source {
  url: string
  sha256: string
}

export const sources = {
  'eng-kjv2006': {
    url: 'https://ebible.org/Scriptures/eng-kjv2006_usfm.zip',
    sha256: 'bf907642b9a37530ebd9cedf08273f62a7c2140e414205fd4b8208be952b4b14'
  },
  'spa-rv1909': {
    url: 'https://ebible.org/Scriptures/spaRV1909_usfm.zip',
    sha256: 'b8c5f45ef19a6d26faa0844dedbb2c8aceefd8698f5ed1e070878f41715b1869'
  },
  'strongs-greek': {
    url: 'https://raw.githubusercontent.com/morphgnt/strongs-dictionary-xml/dd6758b82f46b620804a8ea677d715844679eea1/strongsgreek.xml',
    sha256: '91474213b208a4e487d35f85c10e5c90737acc69082dad15dec5431406003545'
  },
  'strongs-hebrew': {
    url: 'https://raw.githubusercontent.com/openscriptures/HebrewLexicon/21c9add13bc727d3a951361778e97e3ff7afd1ce/HebrewStrong.xml',
    sha256: 'a628f4f89f8bdaf2483fd3faf1abc8653cc6717758dfc9f24beb7571d9bdd0c4'
  }
} satisfies Record<string, Source>

export type SourceId = keyof typeof sources
