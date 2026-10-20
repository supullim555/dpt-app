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
import { loadEntry, saveEntry } from '../storage/storage';
import { today } from '../lib/date';
import { useAsyncEffect } from '../hooks/useAsyncEffect';
import { ITEM_MAP } from './catalog';
import { DEFAULT_STATS, STAT_GAIN, statForId, type StatId } from './stats';
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
  /** Returns which stat (if any) just grew — null if already completed today. */
  completeExercise: (exerciseId: string) => StatId | null;
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
    const saved = await loadEntry<GameState>(STORAGE_KEY);
    if (isCancelled()) return;
    // Field by field: saves from before the shop sold furniture also carry an `equipped`
    // map and colour-item ids, which are simply dropped here.
    if (saved) {
      setState({
        coins: saved.coins ?? 0,
        inventory: saved.inventory ?? [],
        lastCompleted: saved.lastCompleted ?? {},
        // Merged key-by-key, not a plain `?? `: unlike the fields above (present-as-a-whole or
        // absent-as-a-whole), `stats` is an object whose individual keys can be missing — not
        // just today (no `stats` at all in a pre-§33 save), but again whenever a future stat is
        // added (an older save won't have that one key either). The merge keeps every current
        // StatId populated no matter when the save was written.
        stats: { ...DEFAULT_STATS, ...(saved.stats ?? {}) },
      });
    }
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

  const completeExercise = useCallback((exerciseId: string) => {
    const key = today();
    const prev = stateRef.current;
    if (prev.lastCompleted[exerciseId] === key) return null;
    const statId = statForId(exerciseId);
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
