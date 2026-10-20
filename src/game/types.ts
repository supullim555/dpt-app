import type { StatId } from './stats';

export type GameState = {
  coins: number;
  /** Ids of the furniture bought so far (the starting room's pieces aren't listed). */
  inventory: string[];
  lastCompleted: Record<string, string>;
  /** §33's growth-loop stats. See GameContext.tsx's load effect for why this merges key-by-key
   * instead of the sibling fields' plain `?? ` fallback. */
  stats: Record<StatId, number>;
};
