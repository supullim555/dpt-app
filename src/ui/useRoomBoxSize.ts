import { useWindowDimensions } from 'react-native';

// The app's frame: the room (and every panel floating over it) is drawn in a box no wider than
// this (width / height), centered. On phones the box is the whole screen; on wide web windows it
// keeps furniture from stretching into an unrecognisable room. Lives here in ui/ rather than in
// the room feature because shared UI (FloatingPanel) needs it too, and ui/ must not depend on a
// feature — features/room/layout.ts imports it from here.
export const ROOM_MAX_ASPECT = 0.8;

/**
 * The same "cap width to at most ROOM_MAX_ASPECT × height" box RoomBackdrop/layout.ts computes
 * for the room itself, worked out independently here for anything outside RoomBackdrop's own
 * tree — it can't read RoomContext, since that's only provided to RoomBackdrop's children.
 * `FloatingPanel` (§37) uses `width` to stay exactly as wide as the room underneath it instead of
 * stretching edge-to-edge on a wide desktop browser window. `isWide` is true exactly when that
 * cap is actually binding (a landscape-ish desktop window) rather than the viewport's own width
 * (a phone) — the signal `DialogueExercise` uses to show a roomier conversation history instead
 * of the compact phone version.
 */
export function useRoomBoxSize() {
  const { width, height } = useWindowDimensions();
  const boxWidth = Math.min(width, height * ROOM_MAX_ASPECT);
  return { width: boxWidth, height, isWide: boxWidth < width };
}
