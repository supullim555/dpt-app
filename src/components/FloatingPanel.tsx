import React, { type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { PANEL_DARK } from '../theme';

// See CoinBadge.tsx for why this is per-platform rather than one set of props.
const shadow = Platform.select({
  web: { boxShadow: '0 -6px 16px rgba(0,0,0,0.3)' },
  default: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: -6 }, elevation: 12 },
});

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
    ...shadow,
  },
});
