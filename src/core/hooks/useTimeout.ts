import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/** A ref that always holds the latest `value` — for callbacks read from inside timers/animations
 * that shouldn't restart just because the caller passed a new function identity. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

/**
 * Declarative timeout, usehooks-ts style (github.com/juliencrn/usehooks-ts, `useTimeout`): calls
 * `callback` once, `delay` ms after the delay is set; `null` means "no timer". Changing `delay`
 * restarts it, unmounting clears it, and the LATEST callback is the one called. Replaces the
 * `useEffect(() => { const t = setTimeout(...); return () => clearTimeout(t); }, [...])` blocks.
 */
export function useTimeout(callback: () => void, delay: number | null) {
  const saved = useLatest(callback);
  useEffect(() => {
    if (delay === null) return;
    const id = setTimeout(() => saved.current(), delay);
    return () => clearTimeout(id);
  }, [delay, saved]);
}

/**
 * Imperative counterpart for timers started from an event handler rather than from render:
 * `schedule(fn, ms)` replaces any timer this hook already has pending, and unmount clears it —
 * so a "close the panel 1.8s after completion" never fires into a component that's already gone.
 * `cancel()` clears it early. Both are stable across renders.
 */
export function useTimer() {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancel = useCallback(() => clearTimeout(timer.current), []);
  const schedule = useCallback((fn: () => void, ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  }, []);
  useEffect(() => cancel, [cancel]);
  return { schedule, cancel };
}
