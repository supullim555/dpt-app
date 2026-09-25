/** Today's date as yyyy-mm-dd, in the device's local time. The one place this is computed —
 * used to key "did this happen today" (GameContext, memory.ts) consistently everywhere,
 * instead of each call site repeating `new Date().toISOString().slice(0, 10)` (which, worth
 * noting, is UTC — fine for a stable day-key, just not "midnight where the user is"). */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
