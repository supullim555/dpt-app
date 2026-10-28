import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { USE_NATIVE_DRIVER } from './nativeDriver';
import { useLatest } from '@/core/hooks/useTimeout';

export type BreathPhase = {
  /** Value the animated scale moves to during this phase (e.g. 1.5 = inhale to 150%). */
  toValue: number;
  ms: number;
};

type Options = {
  /** Total cycles to breathe before `onDone`. Omit (Infinity) to loop for as long as `running`. */
  cycles?: number;
  /** False pauses before the next cycle starts; the cycle count is kept, so raising `cycles` and
   * setting this back to true continues where it left off. */
  running?: boolean;
  /** Called once each time the count reaches `cycles` while running. */
  onDone?: () => void;
};

const EASE = Easing.inOut(Easing.quad);

/**
 * Drives a breathing guide: one Animated.Value stepping through `phases` (in → hold/sip → out),
 * cycle after cycle. Returns the value to bind to a scale transform, which phase is playing (to
 * show a "숨을 들이쉬어요" label), and how many full cycles are done (for progress dots).
 *
 * Extracted from the two hand-written copies of this loop — the gate's fixed-count cyclic sighing
 * (GateScreen) and the open-ended "숨 고르기" loop (ReliefScreen) — and meant for the next one too:
 * the plan's still-missing post-letter calming routine (§8, "S3 종료 후 짧은 진정 루틴").
 *
 * `phases` must be a stable reference (a module-level constant). The value rests at the LAST
 * phase's `toValue` before the first cycle, which for a breath is the exhaled size.
 */
export function useBreathPacer(phases: readonly BreathPhase[], { cycles = Infinity, running = true, onDone }: Options = {}) {
  const value = useRef(new Animated.Value(phases[phases.length - 1].toValue)).current;
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cyclesDone, setCyclesDone] = useState(0);
  const onDoneRef = useLatest(onDone);

  useEffect(() => {
    if (!running) return;
    if (cyclesDone >= cycles) {
      onDoneRef.current?.();
      return;
    }
    let cancelled = false;
    let current: Animated.CompositeAnimation | null = null;
    const runPhase = (i: number) => {
      if (cancelled) return;
      if (i === phases.length) {
        setCyclesDone((n) => n + 1); // re-runs this effect for the next cycle (or onDone)
        return;
      }
      setPhaseIndex(i);
      current = Animated.timing(value, {
        toValue: phases[i].toValue,
        duration: phases[i].ms,
        easing: EASE,
        useNativeDriver: USE_NATIVE_DRIVER,
      });
      current.start(({ finished }) => {
        if (finished) runPhase(i + 1);
      });
    };
    runPhase(0);
    return () => {
      cancelled = true;
      current?.stop();
    };
  }, [running, cycles, cyclesDone, phases, value, onDoneRef]);

  return { value, phaseIndex, cyclesDone };
}
