import React from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { OVERLAY_LIGHT } from '../theme';

// react-native-web wants CSS boxShadow; native wants the shadow* props (plus elevation for
// Android). Both are correct on their own platform, so pick per-platform instead of one that
// silently does nothing (or logs a deprecation warning) on the other.
const shadow = Platform.select({
  web: { boxShadow: '0 2px 4px rgba(0,0,0,0.15)' },
  default: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
});

type Props = {
  coins: number;
  style?: StyleProp<ViewStyle>;
};

// A small floating pill instead of a full-width top bar band — used on every screen that shows
// the coin count, so it reads as one HUD element floating over a scene rather than another
// screen carved into its own rectangle (the app previously had three of those on Home alone).
function CoinBadgeBase({ coins, style }: Props) {
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.text}>🪙 {coins}</Text>
    </View>
  );
}

export default React.memo(CoinBadgeBase);

const styles = StyleSheet.create({
  badge: {
    backgroundColor: OVERLAY_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    ...shadow,
  },
  text: { fontSize: 13, fontWeight: '700', color: '#444' },
});
