import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INK } from '../theme';

type Props = {
  title: string;
  /** e.g. a CoinBadge — rendered at the row's end. */
  right?: ReactNode;
};

// A big in-content title instead of the native OS header bar: every tab screen (Talk, Memo,
// Shop) uses this, so the app has one consistent look for "what screen am I on" rather than
// mixing the platform's own header chrome with the app's own styling underneath it.
function ScreenHeaderBase({ title, right }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.row, { paddingTop: insets.top + 14 }]}>
      <Text style={styles.title}>{title}</Text>
      {right}
    </View>
  );
}

export default React.memo(ScreenHeaderBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  title: { fontSize: 26, fontWeight: '800', color: INK },
});
