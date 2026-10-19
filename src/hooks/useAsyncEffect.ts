import { useEffect, type DependencyList } from 'react';

/**
 * Runs `effect(isCancelled)` once per `deps` change, the same as `useEffect`, but hands it an
 * `isCancelled()` check instead of making every caller hand-write its own `let cancelled = false`
 * guard + cleanup. That exact pattern — await one load, then skip the resulting `setState` calls
 * if the effect was superseded or the component unmounted first — was written out by hand in
 * HomeScreen (twice), AiChatScreen, GateScreen, IntroGate, and GameContext (§31). Call
 * `isCancelled()` after every `await`, not just once at the top, since more time may have passed
 * by the time a later line runs.
 *
 * Not a fit for an effect that needs its OWN cleanup beyond this flag — unsubscribing a listener,
 * stopping an in-flight Animated sequence, clearing a timer. Those stay as plain `useEffect`
 * (see LoginGate's `onAuthStateChange` subscription, or ReliefScreen/RoamingCharacter's
 * animations) rather than being forced through this.
 */
export function useAsyncEffect(effect: (isCancelled: () => boolean) => void | Promise<void>, deps: DependencyList) {
  useEffect(() => {
    let cancelled = false;
    effect(() => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
