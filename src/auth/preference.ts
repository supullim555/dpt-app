import { loadEntry, saveEntry } from '../storage/storage';

// 'guest' is the only mode that actually does anything right now (§28: "진짜 로그인은 안 하더라도
// 게스트로 실행은 할 수 있게"). Typed as a union of one real value on purpose, not a boolean —
// when real accounts exist later, this grows ('account', etc.) instead of needing a new flag.
export type AuthMode = 'guest' | null;

const KEY = 'auth.mode';

// Caught, not propagated — same reasoning as src/ai/preference.ts's loadAiOptIn: LoginGate
// awaits this before it can show anything at all, so a storage read failure must fail open
// (treat as "no choice made yet") rather than leave the gate stuck on a blank screen.
export async function loadAuthMode(): Promise<AuthMode> {
  try {
    return (await loadEntry<AuthMode>(KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function setAuthMode(mode: AuthMode): Promise<void> {
  await saveEntry(KEY, mode);
}
