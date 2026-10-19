import React, { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { PANEL_DARK, shadow } from '../theme';

const panelShadow = shadow({ y: -6, blur: 16, opacity: 0.3, elevation: 12 });

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// The dark dialogue surface, shaped like a sheet floating up over the room rather than a flat
// bar that cuts the screen into a hard top/bottom split — rounded top corners and a shadow, the
// same shape Gate's breathing/label/scale panel and Home's dialogue use. One shared look, tuned
// in one place, instead of two screens' worth of near-identical StyleSheet entries drifting.
function FloatingPanelBase({ children, style }: Props) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export default React.memo(FloatingPanelBase);

const styles = StyleSheet.create({
  panel: {
    backgroundColor: PANEL_DARK,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    ...panelShadow,
  },
});
