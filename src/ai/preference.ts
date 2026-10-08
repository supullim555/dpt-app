import { loadEntry, saveEntry } from '../storage/storage';

export type AiOptIn = 'unset' | 'on' | 'off';

// Storage key kept as-is from the earlier local-model version (v0.10/v0.11) rather than renamed
// for the Gemini switch (v0.12) — same meaning (has the user turned AI on), no reason to make
// anyone re-decide over a naming change alone.
const KEY = 'ai.local-opt-in';

// Caught, not propagated: IntroGate awaits this before it can show anything at all (§24), so a
// rejection here — corrupted storage, a future incompatible stored shape, anything — would leave
// the whole app stuck on a blank loading screen forever rather than just this one feature failing
// closed. 'unset' is the same safe default used when nothing's been saved yet.
export async function loadAiOptIn(): Promise<AiOptIn> {
  try {
    return (await loadEntry<AiOptIn>(KEY)) ?? 'unset';
  } catch {
    return 'unset';
  }
}

export async function setAiOptIn(value: AiOptIn): Promise<void> {
  await saveEntry(KEY, value);
}
