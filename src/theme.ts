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
