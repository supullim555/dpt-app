/** A Date as yyyy-mm-dd in the DEVICE'S LOCAL time zone. The one place a "which day is this"
 * key is computed — GameContext (done-today checks) and memory.ts (which day something was said)
 * both key off this.
 *
 * Before v0.25 this was `new Date().toISOString().slice(0, 10)`, which is the UTC date: in Korea
 * (UTC+9) "today" didn't roll over until 09:00, so the daily check-in and every exercise's
 * done-today mark reset at 9 a.m. instead of midnight, and something said at 1 a.m. was filed
 * under the previous day in the 메모 tab. */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today's local day key — shorthand for `localDateKey()`. */
export function today(): string {
  return localDateKey();
}
