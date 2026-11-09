// Written by scripts/assets/build-cutscenes.js: don't edit by hand.
import type { ClueId } from './progress';

/** The last light: she turns under the ginkgo, the light, the world in colour, ending on amber. 540x960. */
export const LAST_LIGHT_URL = '/cutscenes/last-light.mp4?v=b6dc46a1f2';

/** Her memories, one for each thing found: from black to black, 8 seconds, 540x960. */
export const MEMORY_FILM: Record<ClueId, string> = {
  collar: '/cutscenes/mem-collar.mp4?v=40b98f96cf',
  snack: '/cutscenes/mem-snack.mp4?v=065989ce72',
  laces: '/cutscenes/mem-laces.mp4?v=60b7ff5567',
  coupon: '/cutscenes/mem-coupon.mp4?v=b8aed98995',
};
