import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ITEM_MAP, type SlotId } from '../game/catalog';

type Props = {
  equipped: Record<SlotId, string>;
  size?: number;
};

// Renders equipped items as stacked layers (background -> body -> outfit -> accessory).
// Each layer only reads its own catalog entry, so adding new items/slots to the
// catalog never requires touching this component.
function CharacterViewBase({ equipped, size = 220 }: Props) {
  const background = ITEM_MAP[equipped.background];
  const body = ITEM_MAP[equipped.body];
  const outfit = ITEM_MAP[equipped.outfit];
  const accessory = ITEM_MAP[equipped.accessory];

  return (
    <View
      style={[
        styles.stage,
        { width: size, height: size, backgroundColor: background?.color ?? '#eee' },
      ]}
    >
      <View
        style={[
          styles.body,
          {
            backgroundColor: body?.color ?? '#ffe0b2',
            width: size * 0.5,
            height: size * 0.5,
            borderRadius: size * 0.25,
          },
        ]}
      />
      {outfit && outfit.color !== 'transparent' && (
        <View
          style={[
            styles.outfit,
            { backgroundColor: outfit.color, width: size * 0.4, height: size * 0.22 },
          ]}
        />
      )}
      {accessory?.emoji && (
        <Text style={[styles.accessory, { fontSize: size * 0.18 }]}>{accessory.emoji}</Text>
      )}
    </View>
  );
}

export default React.memo(CharacterViewBase);

const styles = StyleSheet.create({
  stage: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  body: { position: 'absolute', bottom: '15%' },
  outfit: { position: 'absolute', bottom: '18%', borderRadius: 10 },
  accessory: { position: 'absolute', top: '10%' },
});
