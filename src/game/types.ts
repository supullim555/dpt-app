import type { SlotId } from './catalog';

export type GameState = {
  coins: number;
  inventory: string[];
  equipped: Record<SlotId, string>;
  lastCompleted: Record<string, string>;
};
