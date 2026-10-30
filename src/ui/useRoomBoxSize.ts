import { createContext, useContext } from 'react';
import { useWindowDimensions } from 'react-native';

// The app's frame: the room (and every panel floating over it) is drawn in a box no wider than
// this (width / height), centered. On phones the box is the whole screen; on wide web windows it
// keeps furniture from stretching into an unrecognisable room. Lives here in ui/ rather than in
// the room feature because shared UI (FloatingPanel) needs it too, and ui/ must not depend on a
// feature — features/room/layout.ts imports it from here.
//
// 0.66, not wider: furniture scales with the room's width but is anchored by its height, so a wider
// box grows the bed upward. Past about 0.7 it covers the picture frames (§45).
export const ROOM_MAX_ASPECT = 0.66;

/** Width of the room's box in a stage of this size. */
export function roomBoxWidth(stageWidth: number, stageHeight: number) {
  return Math.min(stageWidth, stageHeight * ROOM_MAX_ASPECT);
}

/** Screen height the stage doesn't get. MainTabs provides its tab bar's height. */
export const ReservedHeightContext = createContext(0);

/**
 * The same box RoomBackdrop/layout.ts computes for the room itself, for anything outside
 * RoomBackdrop's own tree — it can't read RoomContext, since that's only provided to RoomBackdrop's
 * children. `width` keeps FloatingPanel, the quest row and RoomColumn exactly as wide as the room.
 * `isWide` is true exactly when the cap is binding (a landscape-ish desktop window) rather than the
 * viewport's own width (a phone) — the signal DialogueExercise uses to show a roomier conversation
 * history instead of the compact phone version.
 */
export function useRoomBoxSize() {
  const { width, height } = useWindowDimensions();
  const reserved = useContext(ReservedHeightContext);
  const boxWidth = roomBoxWidth(width, height - reserved);
  return { width: boxWidth, height, isWide: boxWidth < width };
}
