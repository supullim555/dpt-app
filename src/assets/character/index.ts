import type { SpriteSheetSpec } from '../../components/SpriteSheetAnimator';
import clipManifest from './clips/manifest.json';

// A sheet plus where the character sits inside each frame, so the roamer can draw
// every pose at the same visible size with her soles on the same spot.
export type CharacterSprite = SpriteSheetSpec & {
  /** Visible height of the character inside a frame, in source px. */
  contentHeight: number;
  /** Where her soles are, as a fraction of frame height from the top. */
  feetFraction: number;
};

// Every animation clip — standing and walking — is a Gemini strip drawn from the same
// detailed portrait (scripts/generate-idle-clips.js, generate-character-views.js), cut
// out by scripts/extract-character-clips.js. They all share ONE cell size and standing
// height, so she keeps the same size and foot position whichever clip is playing and the
// walking, standing and talking art reads as one character.
//
// Each sheet holds its poses once; `sequence` (optional) is the playback order.
const clip = (
  source: number,
  frames: number,
  fps: number,
  sequence?: number[]
): CharacterSprite => ({
  source,
  frameWidth: clipManifest.cellWidth,
  frameHeight: clipManifest.cellHeight,
  frameCount: frames,
  fps,
  sequence,
  contentHeight: clipManifest.contentHeight,
  feetFraction: 1,
});

export const IDLE_CLIPS = {
  // the resting loop: a slow ping-pong through five near-identical poses
  breathe: clip(require('./clips/breathe.png'), clipManifest.clips.breathe.frames, 4, [0, 1, 2, 3, 4, 3, 2, 1]),
  // open, (held) open, closed, open
  blink: clip(require('./clips/blink.png'), clipManifest.clips.blink.frames, 8, [0, 0, 2, 1]),
  // front, turns to the side, holds, turns back
  look: clip(require('./clips/look.png'), clipManifest.clips.look.frames, 3, [2, 1, 0, 0, 1, 2]),
  // neutral, one arm out, both arms up (eyes closed), holds, settles back
  stretch: clip(require('./clips/stretch.png'), clipManifest.clips.stretch.frames, 4, [0, 1, 2, 3, 3, 4, 0]),
};

// One full step cycle each. Sideways is drawn facing right; the roamer mirrors it for left.
export const WALK_CLIPS = {
  down: clip(require('./clips/walk_down.png'), clipManifest.clips.walk_down.frames, 7),
  up: clip(require('./clips/walk_up.png'), clipManifest.clips.walk_up.frames, 7),
  side: clip(require('./clips/walk_side.png'), clipManifest.clips.walk_side.frames, 7),
};

// Every clip by name. They all share one cell size, so the roamer can keep them all
// mounted and just change which one is visible (see SpriteSwitcher).
export const CHARACTER_CLIPS = {
  ...IDLE_CLIPS,
  walk_down: WALK_CLIPS.down,
  walk_up: WALK_CLIPS.up,
  walk_side: WALK_CLIPS.side,
};
export type ClipName = keyof typeof CHARACTER_CLIPS;

// The large, detailed still — used while she's talking.
export const PORTRAIT_FRONT = require('./portrait-front.png');
export const PORTRAIT_ASPECT = 394 / 628; // width / height

// Her visible height as a multiple of the room's `charSize` unit (a calibration constant from
// the original walk sprite, kept as-is since changing it resizes her everywhere she's drawn).
// Every clip shares one contentHeight, so any clip's spec can be passed in here.
const VISIBLE_HEIGHT_PER_SIZE = 264 / 252;

/** The rendered frame size (and the scale that produced it) for a character drawn at `size`
 * (the room's per-character unit) using `spec`. Used everywhere she's drawn in the room —
 * roaming (RoamingCharacter) and standing at the gate (RoomStander) — so they always agree on
 * how big "size" actually looks, instead of each re-deriving the same formula. */
export function frameSizeFor(size: number, spec: CharacterSprite) {
  const pxPerSource = (size * VISIBLE_HEIGHT_PER_SIZE) / spec.contentHeight;
  return {
    pxPerSource,
    frameW: spec.frameWidth * pxPerSource,
    frameH: spec.frameHeight * pxPerSource,
  };
}
