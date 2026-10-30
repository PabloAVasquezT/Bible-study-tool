// Small per-device preferences. Storage can be unavailable (private mode, blocked
// site data), so every access is guarded and the app works without it.
import { useState } from 'react'
import { parsePassagePath } from './lib/passage.ts'

const PREFIX = 'bible-study-tool:'

export const DEFAULT_PASSAGE = '/kjv/gen/1'

/** The last chapter read, as a path, or Genesis 1 in the KJV. */
export function lastPassage(): string {
  const last = readPreference('lastPassage', DEFAULT_PASSAGE)
  return parsePassagePath(last) ? last : DEFAULT_PASSAGE
}

/** The Bible being read, which Bible references elsewhere in the app open in. */
export function readingBible(): string {
  return parsePassagePath(lastPassage())!.bible
}

export function readPreference<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(PREFIX + key)
    return value === null ? fallback : (JSON.parse(value) as T)
  } catch {
    return fallback
  }
}

export function writePreference(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Not saved; the preference only lasts for this visit.
  }
}

export function usePreference<T>(key: string, fallback: T): [T, (value: T) => void] {
  const [value, setValue] = useState(() => readPreference(key, fallback))
  const update = (next: T): void => {
    setValue(next)
    writePreference(key, next)
  }
  return [value, update]
}
