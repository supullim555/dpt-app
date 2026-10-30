import AsyncStorage from '@react-native-async-storage/async-storage';
import { createKeyedLock } from '@/core/lib/keyedLock';

const PREFIX = 'dpt.';

// Every write to a key — and every read-modify-write (updateEntry, createLog) — goes through one
// per-key queue, so two quick saves land in the order they were made and an append can't be
// overwritten by another append that read the list before it.
const runExclusive = createKeyedLock();

async function rawLoad<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(PREFIX + key);
  return raw ? (JSON.parse(raw) as T) : null;
}

function rawSave<T>(key: string, value: T): Promise<void> {
  return AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export function saveEntry<T>(key: string, value: T): Promise<void> {
  return runExclusive(key, () => rawSave(key, value));
}

export async function loadEntry<T>(key: string): Promise<T | null> {
  return rawLoad<T>(key);
}

/**
 * Loads a stored value, failing open to `fallback` on ANY error (corrupted data, a future
 * incompatible shape, a storage backend that throws) instead of letting it propagate.
 *
 * For a plain feature, a failed read just means "use the default this once" — not worth a
 * special helper. It mattered enough to extract here because of flags read by a gate component
 * sitting in front of the entire app (IntroGate's disclaimer flag) before anything else can
 * render. A real bug once left the app stuck on a permanent blank screen because such a flag was
 * read without this safety net (§24) — this makes that failure mode impossible to reintroduce by
 * forgetting a try/catch the next time someone adds a flag like this.
 */
export async function loadEntryOr<T>(key: string, fallback: T): Promise<T> {
  try {
    return (await rawLoad<T>(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Atomic read-modify-write: loads `key` (or `fallback` if missing/unreadable), applies `update`,
 * saves the result and returns it — all inside the key's queue, so concurrent updates each see
 * the previous one's result instead of racing on a stale copy.
 */
export function updateEntry<T>(key: string, fallback: T, update: (current: T) => T): Promise<T> {
  return runExclusive(key, async () => {
    let current = fallback;
    try {
      current = (await rawLoad<T>(key)) ?? fallback;
    } catch {
      // corrupted value: start over from fallback rather than wedge every future write
    }
    const next = update(current);
    await rawSave(key, next);
    return next;
  });
}

export type StoredLog<T> = {
  /** Every entry, oldest first. Never throws — an unreadable log reads as empty. */
  load: () => Promise<T[]>;
  /** Appends entries (oldest-first order kept), trims to `max`, returns the new log. */
  append: (...entries: T[]) => Promise<T[]>;
  /** Atomic rewrite of the whole log (e.g. marking one entry as used). */
  update: (fn: (entries: T[]) => T[]) => Promise<T[]>;
  clear: () => Promise<void>;
};

/**
 * An append-only, size-capped list persisted under one key — the shape memory.ts (what was said)
 * and gate.ts (each visit's feeling + score) both are. Writes are serialized per key (see
 * updateEntry), and the cap keeps a long-lived install from growing the value without bound.
 */
export function createLog<T>(key: string, { max }: { max: number }): StoredLog<T> {
  const cap = (entries: T[]) => (entries.length > max ? entries.slice(-max) : entries);
  return {
    load: () => loadEntryOr<T[]>(key, []),
    append: (...entries) => updateEntry<T[]>(key, [], (log) => cap([...log, ...entries])),
    update: (fn) => updateEntry<T[]>(key, [], (log) => cap(fn(log))),
    clear: () => saveEntry<T[]>(key, []),
  };
}
