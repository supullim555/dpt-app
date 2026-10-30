import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadEntryOr, saveEntry } from '@/core/storage';
import { today } from '@/core/lib/date';
import { mergeWithDefaults } from '@/core/lib/mergeWithDefaults';
import { useAsyncEffect } from '@/core/hooks/useAsyncEffect';

// What the app remembers about the user's progress — nothing that scores them. Coins, the shop
// and the §33 stats were removed in v0.28 (§40's decision: the reason to come back is the next
// chapter of the story, not an external reward).
export type ProgressState = {
  /** activity id (exercise id or DAILY_CHECKIN_ID) -> the local day it was last done. */
  lastCompleted: Record<string, string>;
  /**
   * Room pieces shown on top of the starting room (ids of ROOM_OBJECTS marked `later`). Before
   * v0.28 these were bought in the shop (`inventory`); the story's chapters are meant to grant
   * them from now on (grantRoomItem).
   */
  roomItems: string[];
};

// Same storage key as the old GameState, so existing progress carries over.
const STORAGE_KEY = 'game-state';

const DEFAULT_STATE: ProgressState = {
  lastCompleted: {},
  roomItems: [],
};

/** Pre-v0.28 saves kept the room under `inventory` — keep what people already had in their room. */
function migrate(saved: unknown): ProgressState {
  const merged = mergeWithDefaults(DEFAULT_STATE, saved);
  const legacy = (saved as { inventory?: unknown } | null)?.inventory;
  if (!merged.roomItems.length && Array.isArray(legacy)) {
    merged.roomItems = legacy.filter((id): id is string => typeof id === 'string');
  }
  return merged;
}

type ProgressContextValue = {
  state: ProgressState;
  loaded: boolean;
  /** Marks `activityId` done for today. Returns false if it already was. */
  completeActivity: (activityId: string) => boolean;
  isCompletedToday: (activityId: string) => boolean;
  /** Puts a `later` room piece into the room (no-op if already there). */
  grantRoomItem: (itemId: string) => void;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  // Ref mirrors state so action handlers can validate against the latest
  // value synchronously without depending on (and re-creating for) `state`.
  const stateRef = useRef(state);
  stateRef.current = state;

  useAsyncEffect(async (isCancelled) => {
    const saved = await loadEntryOr<unknown>(STORAGE_KEY, null);
    if (isCancelled()) return;
    if (saved) setState(migrate(saved));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveEntry(STORAGE_KEY, state);
  }, [state, loaded]);

  const completeActivity = useCallback((activityId: string) => {
    const key = today();
    const prev = stateRef.current;
    if (prev.lastCompleted[activityId] === key) return false;
    setState({ ...prev, lastCompleted: { ...prev.lastCompleted, [activityId]: key } });
    return true;
  }, []);

  const isCompletedToday = useCallback(
    (activityId: string) => stateRef.current.lastCompleted[activityId] === today(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.lastCompleted]
  );

  const grantRoomItem = useCallback((itemId: string) => {
    const prev = stateRef.current;
    if (prev.roomItems.includes(itemId)) return;
    setState({ ...prev, roomItems: [...prev.roomItems, itemId] });
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({ state, loaded, completeActivity, isCompletedToday, grantRoomItem }),
    [state, loaded, completeActivity, isCompletedToday, grantRoomItem]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within a ProgressProvider');
  return ctx;
}
