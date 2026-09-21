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
import { ITEM_MAP } from './catalog';
import type { GameState } from './types';

const STORAGE_KEY = 'game-state';
const EXERCISE_REWARD = 10;

const DEFAULT_STATE: GameState = {
  coins: 0,
  inventory: [],
  lastCompleted: {},
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

type GameContextValue = {
  state: GameState;
  loaded: boolean;
  purchaseItem: (itemId: string) => boolean;
  completeExercise: (exerciseId: string) => boolean;
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

  useEffect(() => {
    let cancelled = false;
    loadEntry<GameState>(STORAGE_KEY).then((saved) => {
      if (cancelled) return;
      // Field by field: saves from before the shop sold furniture also carry an `equipped`
      // map and colour-item ids, which are simply dropped here.
      if (saved) {
        setState({
          coins: saved.coins ?? 0,
          inventory: saved.inventory ?? [],
          lastCompleted: saved.lastCompleted ?? {},
        });
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
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
    const today = todayKey();
    const prev = stateRef.current;
    if (prev.lastCompleted[exerciseId] === today) return false;
    setState({
      ...prev,
      coins: prev.coins + EXERCISE_REWARD,
      lastCompleted: { ...prev.lastCompleted, [exerciseId]: today },
    });
    return true;
  }, []);

  const isCompletedToday = useCallback(
    (exerciseId: string) => stateRef.current.lastCompleted[exerciseId] === todayKey(),
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
