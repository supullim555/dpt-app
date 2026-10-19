import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'dpt.';

export async function saveEntry<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export async function loadEntry<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(PREFIX + key);
  return raw ? (JSON.parse(raw) as T) : null;
}

/**
 * Loads a stored value, failing open to `fallback` on ANY error (corrupted data, a future
 * incompatible shape, a storage backend that throws) instead of letting it propagate.
 *
 * For a plain feature, a failed read just means "use the default this once" — not worth a
 * special helper. It mattered enough to extract here because of what src/ai/preference.ts and
 * src/auth/preference.ts both use this for: a one-time choice read by a *Gate component sitting
 * in front of the entire app (IntroGate, LoginGate) before anything else can render. A real bug
 * once left the app stuck on a permanent blank screen because one of those two read its flag
 * without this safety net (§24) — this makes that failure mode impossible to reintroduce by
 * forgetting a try/catch the next time someone adds a flag like this.
 */
export async function loadEntryOr<T>(key: string, fallback: T): Promise<T> {
  try {
    return (await loadEntry<T>(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
