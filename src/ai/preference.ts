import { loadEntry, saveEntry } from '../storage/storage';

export type AiOptIn = 'unset' | 'on' | 'off';

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
