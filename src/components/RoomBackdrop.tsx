import React from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  /** Fixed square card of this size (px). Ignored when `full` is set. */
  size?: number;
  /** Fill the parent instead of being a fixed-size square card. */
  full?: boolean;
  children?: React.ReactNode;
};

// The room's backdrop, with room content (character, HUD) laid over it as
// children. Background customization was removed — this is a fixed look.
function RoomBackdropBase({ size = 0, full = false, children }: Props) {
  return (
    <View
      style={[
        styles.stage,
        full
          ? styles.full
          : { width: size, height: size, borderRadius: 20, borderWidth: 1, borderColor: '#ddd' },
      ]}
    >
      {children}
    </View>
  );
}

export default React.memo(RoomBackdropBase);

const styles = StyleSheet.create({
  stage: { position: 'relative', overflow: 'hidden', backgroundColor: '#bfe3ff' },
  full: { flex: 1 },
});
