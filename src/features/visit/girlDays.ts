// How she is on each day, as a paper doll put together from parts (hospitalArt.ts). She turns a little more
// toward you every day while her body gets weaker, so you come closer as she sinks into the bed. It goes by
// date alone: come back after days away and you see the change you missed. No imports, so
// scripts/check-visit-logic.mjs can run it directly.

export type GirlHead = 'headBack' | 'headSide' | 'headThree' | 'headSideTied' | 'headFront' | 'headTired';
export type GirlBody = 'torsoBack' | 'torso';

export type GirlDay = {
  body: GirlBody;
  /** The way she's facing as you come in, and the way she turns. */
  headFrom: GirlHead;
  headTo: GirlHead;
  /** How far she's risen from the mattress, and how far the paper of her is tipped back onto the pillows. */
  up: number;
  lean: number;
  /** How close you end up, how high you're looking, and from how high: over her, once she's lying down. */
  away: number;
  height: number;
  eye?: number;
  /** The blanket pulled up over her, this far off the mattress; none while she's sitting up. */
  cover?: number;
  notebook: boolean;
  drip: boolean;
  leaves: boolean;
  hand: boolean;
};

const sitting = { body: 'torso', up: 0.27, lean: 0, notebook: false, drip: false, leaves: false, hand: false } as const;
const propped = { ...sitting, up: 0.24, lean: -0.2, drip: true } as const;
const lying = { ...sitting, up: 0.2, lean: -0.55, drip: true, leaves: true } as const;

export const GIRL_DAYS: Record<number, GirlDay> = {
  1: { ...sitting, body: 'torsoBack', headFrom: 'headBack', headTo: 'headSide', away: 1.28, height: 0.68 },
  2: { ...sitting, headFrom: 'headSide', headTo: 'headThree', notebook: true, away: 1.14, height: 0.68 },
  3: { ...sitting, headFrom: 'headSideTied', headTo: 'headFront', away: 1.02, height: 0.68 },
  4: { ...propped, headFrom: 'headFront', headTo: 'headFront', away: 0.92, height: 0.62 },
  5: { ...propped, up: 0.22, lean: -0.32, headFrom: 'headSideTied', headTo: 'headTired', leaves: true, away: 0.84, height: 0.6 },
  6: { ...lying, headFrom: 'headSideTied', headTo: 'headTired', cover: 0.09, away: 0.62, height: 0.56, eye: 0.72 },
  7: { ...lying, up: 0.18, lean: -0.62, headFrom: 'headTired', headTo: 'headTired', hand: true, cover: 0.05, away: 0.52, height: 0.52, eye: 0.72 },
};

export const girlOn = (day: number): GirlDay => GIRL_DAYS[Math.min(Math.max(day, 1), 7)];

/** Where her hairpin sits on the heads that have it, across and up from the bottom middle of the drawing. */
export const PIN_ON: Partial<Record<GirlHead, [number, number]>> = {
  headSideTied: [0.03, 0.462],
  headFront: [0.061, 0.457],
  headTired: [0.063, 0.457],
};
