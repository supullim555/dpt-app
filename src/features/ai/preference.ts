import { loadEntryOr, saveEntry } from '@/core/storage';

export type AiOptIn = 'unset' | 'on' | 'off';

// Storage key kept as-is from the earlier local-model version (v0.10/v0.11) rather than renamed
// for the Gemini switch (v0.12) — same meaning (has the user turned AI on), no reason to make
// anyone re-decide over a naming change alone.
const KEY = 'ai.local-opt-in';

// See storage.ts's loadEntryOr for why this fails open to 'unset' instead of throwing —
// IntroGate awaits this before it can show anything at all.
export const loadAiOptIn = () => loadEntryOr<AiOptIn>(KEY, 'unset');
export const setAiOptIn = (value: AiOptIn) => saveEntry(KEY, value);
