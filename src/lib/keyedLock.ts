/**
 * Per-key async lock: `runExclusive(key, task)` waits for every earlier task on the same key to
 * settle before starting `task`, so a read-modify-write across an `await` (load a list, change
 * it, save it back) can't interleave with another one on that key and silently drop its change.
 * Tasks on different keys still run concurrently. Same idea as async-mutex's `runExclusive`
 * (github.com/DirtyHairy/async-mutex), keyed like async-lock, in ~15 lines instead of a dependency.
 *
 * A task that throws rejects only its own caller; the queue behind it keeps going.
 */
export function createKeyedLock() {
  const tails = new Map<string, Promise<unknown>>();

  return function runExclusive<T>(key: string, task: () => Promise<T>): Promise<T> {
    const prev = tails.get(key) ?? Promise.resolve();
    const run = prev.then(task);
    const tail = run.catch(() => undefined);
    tails.set(key, tail);
    // Drop the entry once this is the last task queued for the key, so the map doesn't grow.
    tail.then(() => {
      if (tails.get(key) === tail) tails.delete(key);
    });
    return run;
  };
}
