export type GameState = {
  coins: number;
  /** Ids of the furniture bought so far (the starting room's pieces aren't listed). */
  inventory: string[];
  lastCompleted: Record<string, string>;
};
