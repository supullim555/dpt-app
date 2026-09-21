import React, { useCallback } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SHOP_ITEMS, type ShopItem } from '../game/catalog';
import { useGame } from '../game/GameContext';

// The shop sells the room's furniture: buying a piece puts it in the room. Nothing here
// pushes the player to buy (§4) — no badges, no "new", no countdowns; it's just a quiet list.
export default function ShopScreen() {
  const { state, purchaseItem } = useGame();

  const handlePress = useCallback((item: ShopItem) => purchaseItem(item.id), [purchaseItem]);

  return (
    <View style={styles.container}>
      <Text style={styles.coins}>보유 코인: {state.coins}</Text>
      <FlatList
        data={SHOP_ITEMS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ShopRow
            item={item}
            owned={state.inventory.includes(item.id)}
            affordable={state.coins >= item.price}
            onPress={handlePress}
          />
        )}
      />
    </View>
  );
}

type RowProps = {
  item: ShopItem;
  owned: boolean;
  affordable: boolean;
  onPress: (item: ShopItem) => void;
};

const ShopRow = React.memo(function ShopRow({ item, owned, affordable, onPress }: RowProps) {
  const disabled = owned || !affordable;
  return (
    <TouchableOpacity
      style={[styles.row, disabled && !owned && styles.rowDim]}
      disabled={disabled}
      onPress={() => onPress(item)}
    >
      <View style={styles.thumb}>
        <Image source={item.image} style={styles.thumbImage} resizeMode="contain" />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{item.name}</Text>
        <Text style={styles.rowStatus}>{owned ? '방에 있어요' : `${item.price} 코인`}</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  coins: { fontSize: 15, fontWeight: '700', color: '#444', padding: 16, paddingBottom: 8 },
  listContent: { paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  rowDim: { opacity: 0.55 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#f6e3cf',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: { width: 52, height: 52 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#222' },
  rowStatus: { fontSize: 12, color: '#888', marginTop: 2 },
});
