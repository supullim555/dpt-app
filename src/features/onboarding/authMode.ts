import { loadEntryOr, saveEntry } from '@/core/storage';

// 'guest' is the only mode that actually does anything right now (§28: "진짜 로그인은 안 하더라도
// 게스트로 실행은 할 수 있게"). Typed as a union of one real value on purpose, not a boolean —
// when real accounts exist later, this grows ('account', etc.) instead of needing a new flag.
export type AuthMode = 'guest' | null;

const KEY = 'auth.mode';

// See storage.ts's loadEntryOr for why this fails open to null instead of throwing — LoginGate
// awaits this before it can show anything at all.
export const loadAuthMode = () => loadEntryOr<AuthMode>(KEY, null);
export const setAuthMode = (mode: AuthMode) => saveEntry(KEY, mode);
