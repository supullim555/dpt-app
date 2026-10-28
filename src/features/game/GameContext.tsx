import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { loadEntryOr, saveEntry } from '@/core/storage';
import { today } from '@/core/lib/date';
import { mergeWithDefaults } from '@/core/lib/mergeWithDefaults';
import { useAsyncEffect } from '@/core/hooks/useAsyncEffect';
import { ITEM_MAP } from './catalog';
import { DEFAULT_STATS, STAT_GAIN, type StatId } from './stats';
import type { GameState } from './types';

const STORAGE_KEY = 'game-state';
const EXERCISE_REWARD = 10;

const DEFAULT_STATE: GameState = {
  coins: 0,
  inventory: [],
  lastCompleted: {},
  stats: DEFAULT_STATS,
};

type GameContextValue = {
  state: GameState;
  loaded: boolean;
  purchaseItem: (itemId: string) => boolean;
  /** Marks `activityId` done for today (+coins, and +STAT_GAIN to `statId` if given). Returns
   * which stat grew — null if it was already done today or no stat was given. */
  completeExercise: (activityId: string, statId?: StatId) => StatId | null;
  isCompletedToday: (exerciseId: string) => boolean;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  // Ref mirrors state so action handlers can validate against the latest
  // value synchronously without depending on (and re-creating for) `state`.
  const stateRef = useRef(state);
  stateRef.current = state;

  useAsyncEffect(async (isCancelled) => {
    const saved = await loadEntryOr<unknown>(STORAGE_KEY, null);
    if (isCancelled()) return;
    // mergeWithDefaults is the whole migration: keys older saves carried but this version doesn't
    // (the pre-furniture shop's `equipped` map) are dropped, a wrongly-typed value falls back to
    // its default, and `stats` merges key by key so a stat added after the save was written still
    // starts at 0 instead of `undefined`. A new GameState field needs only a DEFAULT_STATE entry.
    if (saved) setState(mergeWithDefaults(DEFAULT_STATE, saved));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveEntry(STORAGE_KEY, state);
  }, [state, loaded]);

  const purchaseItem = useCallback((itemId: string) => {
    const item = ITEM_MAP[itemId];
    const prev = stateRef.current;
    if (!item || prev.inventory.includes(itemId) || prev.coins < item.price) return false;
    setState({
      ...prev,
      coins: prev.coins - item.price,
      inventory: [...prev.inventory, itemId],
    });
    return true;
  }, []);

  const completeExercise = useCallback((exerciseId: string, statId?: StatId) => {
    const key = today();
    const prev = stateRef.current;
    if (prev.lastCompleted[exerciseId] === key) return null;
    setState({
      ...prev,
      coins: prev.coins + EXERCISE_REWARD,
      lastCompleted: { ...prev.lastCompleted, [exerciseId]: key },
      stats: statId ? { ...prev.stats, [statId]: prev.stats[statId] + STAT_GAIN } : prev.stats,
    });
    return statId ?? null;
  }, []);

  const isCompletedToday = useCallback(
    (exerciseId: string) => stateRef.current.lastCompleted[exerciseId] === today(),
    [state.lastCompleted]
  );

  const value = useMemo<GameContextValue>(
    () => ({ state, loaded, purchaseItem, completeExercise, isCompletedToday }),
    [state, loaded, purchaseItem, completeExercise, isCompletedToday]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}
