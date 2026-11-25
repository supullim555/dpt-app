// Written by scripts/assets/build-cutscenes.js: don't edit by hand.
import type { ClueId } from './progress';

/** The last light: she turns under the ginkgo, the light, the world in colour, ending on amber. 540x960. */
export const LAST_LIGHT_URL = '/cutscenes/last-light.mp4?v=3a8e207bad';

/** The way down to the ginkgo, floor by floor in the seventh day's corridors, from black to black. 540x960. */
export const DESCENT_URL = '/cutscenes/descent.mp4?v=cb913fbe49';

/** Her memories, one for each thing found: from black to black, 8 seconds, 540x960. */
export const MEMORY_FILM: Record<ClueId, string> = {
  collar: '/cutscenes/mem-collar.mp4?v=9c58ec8038',
  snack: '/cutscenes/mem-snack.mp4?v=e2b540cb82',
  laces: '/cutscenes/mem-laces.mp4?v=71426f3f17',
  coupon: '/cutscenes/mem-coupon.mp4?v=6d46c368e5',
};
