import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// §29 (2026-10-19): the project linked back on 2026-09-15 (`supabase link`, see
// supabase/.temp/linked-project.json) but never wired into any code until now.
//
// Both values below are PUBLIC by design — the "publishable" key is Supabase's current
// client-safe key (the replacement for the older "anon" key), meant to ship inside a client
// bundle; real access control lives in Supabase's Row Level Security policies, not in keeping
// this key secret. This is a different trust model from api/chat.ts's GEMINI_API_KEY, which
// stays server-only because Gemini bills per call and has no per-request access-control layer
// of its own — never put this project's "secret" key (the service_role equivalent) here; that
// one would need the same server-only treatment if anything ever needs it.
const SUPABASE_URL = 'https://nqknusvmktozhztlgqyj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_3TptWJ6e1jDO2k2Eitqwyg_NxFDe0UO';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // Same AsyncStorage every other on-device store in this app uses (src/storage/storage.ts) —
    // keeps the session across app restarts, the same way everything else here already persists.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No OAuth/magic-link redirect flow wired up yet (email+password only, §29), so there's no
    // URL to parse a session out of.
    detectSessionInUrl: false,
  },
});
