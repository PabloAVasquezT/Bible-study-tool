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
  }
} satisfies Record<string, Source>

export type SourceId = keyof typeof sources
