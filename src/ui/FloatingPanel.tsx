import React, { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { PANEL_DARK, shadow } from './theme';
import { useRoomBoxSize } from './useRoomBoxSize';

const panelShadow = shadow({ y: -6, blur: 16, opacity: 0.3, elevation: 12 });

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// The dark dialogue surface, shaped like a sheet floating up over the room rather than a flat
// bar that cuts the screen into a hard top/bottom split — rounded top corners and a shadow, the
// same shape Gate's breathing/label/scale panel and Home's dialogue use. One shared look, tuned
// in one place, instead of two screens' worth of near-identical StyleSheet entries drifting.
//
// §37: width is capped to match the room's own box (useRoomBoxSize — the panel is a sibling of
// RoomBackdrop, not a descendant, so it can't read RoomContext and has to work this out itself).
// On a phone this is a no-op (the cap is wider than the viewport), but on a wide desktop browser
// window it keeps the dialogue from stretching into a giant near-empty dark bar — it stays
// exactly as wide as the room underneath it, and centers itself, instead of pinned edge-to-edge.
function FloatingPanelBase({ children, style }: Props) {
  const { width: boxWidth } = useRoomBoxSize();
  return <View style={[styles.panel, { width: boxWidth }, style]}>{children}</View>;
}

export default React.memo(FloatingPanelBase);

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    backgroundColor: PANEL_DARK,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    ...panelShadow,
  },
});
