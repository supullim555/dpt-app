import type { SpriteSheetSpec } from '../../components/SpriteSheetAnimator';

// Extracted from 캐릭터_스포트라이트_시트.png via scripts/extract-character.js
// (single row per pose, background chroma-keyed to transparent).
export const IDLE_FRONT_SPRITE: SpriteSheetSpec = {
  source: require('./idle-front.png'),
  frameWidth: 252,
  frameHeight: 276,
  frameCount: 4,
  fps: 3,
};

export const WALK_SOUTH_SPRITE: SpriteSheetSpec = {
  source: require('./walk-south.png'),
  frameWidth: 252,
  frameHeight: 277,
  frameCount: 4,
  fps: 6,
};

// Generated with Gemini (scripts/generate-walk-away.js) from the original
// back-of-head frame, since the sheet only had one still pose for this
// angle — a 4-frame walk cycle for moving away from the viewer (upward).
export const WALK_AWAY_SPRITE: SpriteSheetSpec = {
  source: require('./walk-away.png'),
  frameWidth: 252,
  frameHeight: 277,
  frameCount: 4,
  fps: 6,
};

export const PORTRAIT_FRONT = require('./portrait-front.png');
