function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Rebuilds a saved object against its current defaults — the load-time migration every persisted
 * state shape here needs. Same job as zustand persist's custom `merge` option (its default merge
 * is shallow, which is exactly the bug class this avoids):
 *
 *   - Only keys present in `defaults` survive at the top level, so fields an older version used to
 *     save (e.g. the pre-furniture shop's `equipped` map) are dropped instead of carried forever.
 *   - A saved value whose type doesn't match its default (null, a string where a number belongs,
 *     an array where an object belongs) falls back to the default instead of crashing later.
 *   - A plain-object field (a `Record<Id, number>` like `stats`) merges KEY BY KEY —
 *     `{ ...default, ...saved }` — so a key added after the save was written still gets its
 *     default. Without this, adding a 7th stat would leave it `undefined` in every older save.
 *     Saved keys the default doesn't list are kept at this level (`lastCompleted`'s default is
 *     `{}`, and every key in it is a real one).
 *   - Arrays replace their default as a whole.
 */
export function mergeWithDefaults<T extends object>(defaults: T, saved: unknown): T {
  if (!isPlainObject(saved)) return defaults;
  const out = { ...defaults } as Record<string, unknown>;
  for (const [key, def] of Object.entries(defaults)) {
    const value = saved[key];
    if (value === undefined) continue;
    if (isPlainObject(def)) {
      if (isPlainObject(value)) out[key] = { ...def, ...value };
    } else if (Array.isArray(def)) {
      if (Array.isArray(value)) out[key] = value;
    } else if (typeof value === typeof def) {
      out[key] = value;
    }
  }
  return out as T;
}
