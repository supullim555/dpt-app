// §33's "프린세스 메이커 느낌" growth loop — six stats, each fed by exactly one exercise (plus
// the daily check-in), so training reads as "pick one thing, that one thing grows" rather than
// a single abstract progress bar. Deliberately NOT framed clinically (용기/통찰/희망/유연함/평온/
// 유대감 read as game stats, not diagnostic axes) — the user explicitly asked to prioritize game
// feel over therapeutic framing for this pass.
export type StatId = 'courage' | 'insight' | 'hope' | 'flexibility' | 'calm' | 'bond';

export const STAT_IDS: StatId[] = ['courage', 'insight', 'hope', 'flexibility', 'calm', 'bond'];

export const STAT_LABEL: Record<StatId, string> = {
  courage: '용기',
  insight: '통찰',
  hope: '희망',
  flexibility: '유연함',
  calm: '평온',
  bond: '유대감',
};

// Shown until src/assets/statIcons.ts's generated icons load (and kept as the permanent fallback
// if one is ever missing) — same pattern as QuestWidget's '💭' fallback.
export const STAT_EMOJI_FALLBACK: Record<StatId, string> = {
  courage: '🔥',
  insight: '💡',
  hope: '🌱',
  flexibility: '🎗️',
  calm: '🍵',
  bond: '💞',
};

export const DEFAULT_STATS: Record<StatId, number> = {
  courage: 0,
  insight: 0,
  hope: 0,
  flexibility: 0,
  calm: 0,
  bond: 0,
};

// Flat, no jitter — keeps the stat-up toast's text ("용기 +2") predictable, same spirit as
// GameContext's own flat EXERCISE_REWARD.
export const STAT_GAIN = 2;

// A full bar in the status screen: 25 completions of a +2 stat. Easy to retune later.
export const BAR_MAX = 50;

// Which stat a completable id feeds — exercise ids from src/data/exercises.ts, plus the daily
// check-in's id (kept as a plain string here, not imported from game/memory.ts, to avoid a
// memory.ts <-> stats.ts import cycle; GameContext already imports both separately).
// AI chat ('ai-chat') is deliberately NOT included this pass — it doesn't call completeExercise
// at all today, and wiring it in would mean also deciding whether it should start granting coins,
// which is a separate decision outside this pass's scope.
export const ID_STAT: Record<string, StatId> = {
  'externalization-interview': 'courage',
  'scaling-exception': 'insight',
  'letter-from-future-self': 'hope',
  'defusion-play': 'flexibility',
  'thought-check': 'calm',
  'daily-checkin': 'bond',
};

export function statForId(id: string): StatId | undefined {
  return ID_STAT[id];
}

const TITLE: Record<StatId, string> = {
  courage: '용감한 모험가',
  insight: '통찰력 있는 관찰자',
  hope: '희망을 품은 사람',
  flexibility: '유연한 마음',
  calm: '평온한 사람',
  bond: '다정한 동반자',
};

/** A deterministic title from whichever stat is currently highest — no AI call, so it's instant
 * and never costs anything. Ties resolve to whichever stat comes first in STAT_IDS, so the title
 * doesn't flicker between two leaders on a tie. Null until anything has grown at all. */
export function dominantTitle(stats: Record<StatId, number>): string | null {
  const top = STAT_IDS.reduce((a, b) => (stats[b] > stats[a] ? b : a));
  return stats[top] > 0 ? TITLE[top] : null;
}
