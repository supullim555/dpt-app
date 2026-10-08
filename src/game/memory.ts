import { loadEntry, saveEntry } from '../storage/storage';
import { today } from '../lib/date';

// The device-local record of what the user has actually said, so a later session can bring
// a piece of it back up — the way a counselor would open with "last time you mentioned...",
// not just note that a session happened. This is the mechanism behind §4's "실습을 완료하고
// 흔적이 남는" device: continuity signaled by CONTENT, not a streak or a grown character.
//
// Rules this keeps to (so it doesn't drift into what §1/§8 rule out):
//   - A callback (takeCallback) only ever QUOTES the user's own words back. Never paraphrases
//     or summarizes — a callback is phrased as "지난번에 '~'라고 했었죠", which would misattribute
//     an AI paraphrase to the user if the quoted text weren't literally theirs.
//   - Never mentions how long it's been. No "지난주에", no day counts — §4 forbids pointing
//     out absence, and a callback that implies "you were gone" would read as exactly that.
//   - Stays on-device only, same as everything else here (§8) — nothing here is sent anywhere
//     AFTER being recorded. (recordAiSummary is the one exception to how an entry is CREATED,
//     not to this: the summary text was already sent to Gemini to be generated, as part of the
//     free-chat feature the user explicitly turned on — this just stores the result locally,
//     same as every other entry.)
//
// kind: 'ai-summary' entries (§25, 2026-10-08) are the one deliberate exception to the first
// rule above — a Gemini-generated recap of a free-chat conversation, not the user's own words
// verbatim. takeCallback excludes them from its pool for exactly that reason: quoting one back
// as "지난번에 '~'라고 했었죠" would present an AI paraphrase as something the user said. They're
// still saved and shown in the 메모 tab like everything else — just never recalled as a callback.

export const DAILY_CHECKIN_ID = 'daily-checkin';
export const AI_CHAT_ID = 'ai-chat';

export type MemoryEntry = {
  id: string; // exercise id, DAILY_CHECKIN_ID, or AI_CHAT_ID
  date: string; // yyyy-mm-dd, the day it was said
  question: string;
  answer: string;
  /** Set once this has been brought back up, so the same line isn't reused. Always false and
   * never set true for an 'ai-summary' entry — see takeCallback. */
  recalled: boolean;
  /** Absent (treated as 'qa') for every entry recorded before this field existed, and for every
   * recordMemory call since — those are always the user's own verbatim answer to a fixed
   * question. 'ai-summary' is the one kind that isn't: see the file header. */
  kind?: 'qa' | 'ai-summary';
};

const KEY = 'memory.log';
const MAX_ENTRIES = 300; // caps growth on a long-lived install
const MIN_ANSWER_LENGTH = 4; // shorter than this is rarely worth quoting back (e.g. "네", "몰라요")
const QUOTE_MAX = 40; // characters shown in a dialogue bubble before truncating

export async function loadMemory(): Promise<MemoryEntry[]> {
  return (await loadEntry<MemoryEntry[]>(KEY)) ?? [];
}

/** Records today's answerable Q/A pairs, skipping blank or too-short ones. Call after a
 * dialogue completes, with the same `questions` that were actually asked and the `answers`
 * the dialogue returned (the two line up 1:1 regardless of any non-answerable lead-in beat). */
export async function recordMemory(id: string, questions: string[], answers: string[]): Promise<void> {
  const date = today();
  const entries: MemoryEntry[] = [];
  questions.forEach((question, i) => {
    const answer = (answers[i] ?? '').trim();
    if (answer.length >= MIN_ANSWER_LENGTH) {
      entries.push({ id, date, question, answer, recalled: false });
    }
  });
  if (!entries.length) return;
  const log = await loadMemory();
  await saveEntry(KEY, [...log, ...entries].slice(-MAX_ENTRIES));
}

/** Saves a Gemini-generated recap of a free-chat conversation (AiChatScreen's "정리해서 저장").
 * `question` is fixed rather than taken from the conversation — there's no single "question"
 * a free chat answers, so this just labels what the entry is for the 메모 tab's display. See
 * the file header for why this is `kind: 'ai-summary'` and never eligible as a callback. */
export async function recordAiSummary(summary: string): Promise<void> {
  const clean = summary.trim();
  if (clean.length < MIN_ANSWER_LENGTH) return;
  const entry: MemoryEntry = {
    id: AI_CHAT_ID,
    date: today(),
    question: 'AI가 정리한 이야기',
    answer: clean,
    recalled: false,
    kind: 'ai-summary',
  };
  const log = await loadMemory();
  await saveEntry(KEY, [...log, entry].slice(-MAX_ENTRIES));
}

/**
 * A past answer worth bringing up again: not from today, not already used once, and never an
 * AI-generated summary (see the file header — a callback quotes as "지난번에 '~'라고 했었죠", which
 * only a literal verbatim 'qa' entry can honestly support). With `sameId` (an exercise screen
 * asking about its own past answers) it only looks at that thread; without it (the general Home
 * greeting) it prefers daily-checkin material first, so an exercise's own memory stays available
 * for that exercise's own screen instead of being used up generically. The chosen entry is
 * marked recalled immediately, not when the beat is actually seen — in the rare case the screen
 * is left before that beat renders, that one entry is quietly skipped over rather than shown
 * twice, which errs the right way for a "does not repeat itself" design.
 */
export async function takeCallback(sameId?: string): Promise<MemoryEntry | null> {
  const date = today();
  const log = await loadMemory();
  const pool = log.filter(
    (e) => !e.recalled && e.date !== date && e.kind !== 'ai-summary' && (!sameId || e.id === sameId)
  );
  if (!pool.length) return null;
  const preferred = sameId ? pool : pool.filter((e) => e.id === DAILY_CHECKIN_ID);
  const candidates = preferred.length ? preferred : pool;
  const chosen = candidates[candidates.length - 1]; // most recent
  await saveEntry(KEY, log.map((e) => (e === chosen ? { ...e, recalled: true } : e)));
  return chosen;
}

/** One line, whitespace collapsed, capped for a dialogue bubble. */
export function quote(answer: string): string {
  const clean = answer.replace(/\s+/g, ' ').trim();
  return clean.length > QUOTE_MAX ? `${clean.slice(0, QUOTE_MAX)}…` : clean;
}

/** Erases the whole log — the journal screen's "전체 기록 지우기". Also empties what future
 * callbacks (takeCallback) can draw from; there's nothing else to clear alongside it, since
 * this is the only place any of this is stored (§8: on-device only, never sent anywhere). */
export async function clearMemory(): Promise<void> {
  await saveEntry(KEY, []);
}
