import { useCallback, useRef, useState } from 'react';
import type { StatId } from '../game/stats';

/** Matches useDialogueCompletion's COMPLETION_HOLD_MS so a stat-up toast clears at the same
 * moment the panel that showed it closes, instead of on its own independent timer. */
export const STAT_TOAST_MS = 1800;

export type StatToastState = { statId: StatId; gain: number } | null;

/** Small transient "stat just went up" state, shown by StatUpToast. Its own hook (not folded
 * into useDialogueCompletion) because it needs to be triggerable from places that don't go
 * through that hook too, later. */
export function useStatToast() {
  const [toast, setToast] = useState<StatToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((statId: StatId, gain: number) => {
    setToast({ statId, gain });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), STAT_TOAST_MS);
  }, []);

  return { toast, show };
}
