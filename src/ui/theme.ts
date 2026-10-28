import { Platform } from 'react-native';

// Shared design tokens. Not an exhaustive design system — just the handful of values that
// were duplicated across screens, in one case (PANEL_DARK) with three slightly different
// shades of "the same" dark surface by accident (0.82 / 0.88 / 0.9 alpha on near-black).
// Centralizing them means a future tone/re-skin change is one edit here instead of a
// grep-and-replace across every screen.
export const SCREEN_BG = '#fafafa';
export const BORDER = '#eee';
export const INK = '#222'; // primary dark text, and dark buttons on a light background
export const MUTED = '#666';

/** The dark dialogue/panel surface: Home's dialogue card, Gate's bottom panel. */
export const PANEL_DARK = 'rgba(20,20,20,0.92)';
export const TEXT_ON_DARK = '#fff';
export const TEXT_ON_DARK_MUTED = 'rgba(255,255,255,0.7)';

/** A soft floating "HUD" surface over the room scene — CoinBadge, the skip pill. */
export const OVERLAY_LIGHT = 'rgba(255,255,255,0.92)';
export const TAB_INACTIVE = '#a8a8a8';

/** ReliefScreen's full-screen background — a muted, calm green distinct from Gate's brown,
 * deliberately not a bright/cheerful tone (a distressed user is the one opening this screen). */
export const RELIEF_BG = '#26332c';

/**
 * A platform-appropriate shadow style. react-native-web wants a CSS `boxShadow` string; native
 * wants the `shadow*` props plus `elevation` for Android — writing that split out by hand at
 * every call site is exactly the kind of boilerplate that drifts (§30: CoinBadge, FloatingPanel,
 * QuestWidget and MainTabs' relief button each had their own copy, two of them with identical
 * values duplicated verbatim). Call with just the values that actually vary; `elevation`
 * defaults to a reasonable guess from `blur` when omitted.
 */
export function shadow(opts: { x?: number; y: number; blur: number; opacity: number; elevation?: number }) {
  const { x = 0, y, blur, opacity, elevation } = opts;
  return Platform.select({
    web: { boxShadow: `${x}px ${y}px ${blur}px rgba(0,0,0,${opacity})` },
    default: {
      shadowColor: '#000',
      shadowOpacity: opacity,
      shadowRadius: blur,
      shadowOffset: { width: x, height: y },
      elevation: elevation ?? Math.max(2, Math.round(blur / 2)),
    },
  });
}

/** The small floating-chip shadow shared by QuestWidget's buttons and MainTabs' relief pill —
 * same values, previously duplicated in both files rather than shared. */
export const CHIP_SHADOW = shadow({ y: 2, blur: 6, opacity: 0.15, elevation: 3 });
