// §33's "프린세스 메이커 느낌" growth loop — six stats, each fed by exactly one exercise (plus
// the daily check-in), so training reads as "pick one thing, that one thing grows" rather than
// a single abstract progress bar. Deliberately NOT framed clinically (용기/통찰/희망/유연함/평온/
// 유대감 read as game stats, not diagnostic axes) — the user explicitly asked to prioritize game
// feel over therapeutic framing for this pass.

// The single place a stat is defined. Adding one = one entry here (order = display order and
// tie-break order for the title). Older saves get it at 0 automatically (GameContext loads through
// mergeWithDefaults); a generated icon in src/assets/statIcons.ts is optional — `emoji` is shown
// until/unless there is one.
const STATS = {
  courage: { label: '용기', emoji: '🔥', title: '용감한 모험가' },
  insight: { label: '통찰', emoji: '💡', title: '통찰력 있는 관찰자' },
  hope: { label: '희망', emoji: '🌱', title: '희망을 품은 사람' },
  flexibility: { label: '유연함', emoji: '🎗️', title: '유연한 마음' },
  calm: { label: '평온', emoji: '🍵', title: '평온한 사람' },
  bond: { label: '유대감', emoji: '💞', title: '다정한 동반자' },
} as const satisfies Record<string, { label: string; emoji: string; title: string }>;

export type StatId = keyof typeof STATS;

export const STAT_IDS = Object.keys(STATS) as StatId[];

const mapStats = <T,>(fn: (id: StatId) => T) =>
  Object.fromEntries(STAT_IDS.map((id) => [id, fn(id)])) as Record<StatId, T>;

export const STAT_LABEL: Record<StatId, string> = mapStats((id) => STATS[id].label);

// Shown until src/assets/statIcons.ts's generated icons load (and kept as the permanent fallback
// if one is ever missing) — same pattern as QuestWidget's '💭' fallback.
export const STAT_EMOJI_FALLBACK: Record<StatId, string> = mapStats((id) => STATS[id].emoji);

export const DEFAULT_STATS: Record<StatId, number> = mapStats(() => 0);

// Flat, no jitter — keeps the stat-up toast's text ("용기 +2") predictable, same spirit as
// GameContext's own flat EXERCISE_REWARD.
export const STAT_GAIN = 2;

// A full bar in the status screen: 25 completions of a +2 stat. Easy to retune later.
export const BAR_MAX = 50;

// Which stat an activity grows is declared by the activity itself (Exercise.stat in
// features/exercises, DAILY_CHECKIN_STAT for Home's check-in) and handed to completeExercise —
// this module knows the stats, not the list of activities that feed them.

/** A deterministic title from whichever stat is currently highest — no AI call, so it's instant
 * and never costs anything. Ties resolve to whichever stat comes first in STAT_IDS, so the title
 * doesn't flicker between two leaders on a tie. Null until anything has grown at all. */
export function dominantTitle(stats: Record<StatId, number>): string | null {
  const top = STAT_IDS.reduce((a, b) => (stats[b] > stats[a] ? b : a));
  return stats[top] > 0 ? STATS[top].title : null;
}
