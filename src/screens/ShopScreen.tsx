import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ITEMS_BY_SLOT, SLOT_LABELS, SLOT_ORDER, type ShopItem, type SlotId } from '../game/catalog';
import { useGame } from '../game/GameContext';

export default function ShopScreen() {
  const { state, purchaseItem, equipItem } = useGame();
  const [activeSlot, setActiveSlot] = useState<SlotId>('background');

  const handlePress = useCallback(
    (item: ShopItem, owned: boolean) => {
      if (owned) {
        equipItem(item.id);
      } else {
        purchaseItem(item.id);
      }
    },
    [purchaseItem, equipItem]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.coins}>보유 코인: {state.coins}</Text>
      <View style={styles.tabs}>
        {SLOT_ORDER.map((slot) => (
          <TouchableOpacity
            key={slot}
            style={[styles.tab, activeSlot === slot && styles.tabActive]}
            onPress={() => setActiveSlot(slot)}
          >
            <Text style={[styles.tabText, activeSlot === slot && styles.tabTextActive]}>
              {SLOT_LABELS[slot]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={ITEMS_BY_SLOT[activeSlot]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ShopRow
            item={item}
            owned={state.inventory.includes(item.id)}
            equipped={state.equipped[item.slot] === item.id}
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
  equipped: boolean;
  onPress: (item: ShopItem, owned: boolean) => void;
};

const ShopRow = React.memo(function ShopRow({ item, owned, equipped, onPress }: RowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      disabled={equipped}
      onPress={() => onPress(item, owned)}
    >
      <View
        style={[
          styles.swatch,
          { backgroundColor: item.color === 'transparent' ? '#f0f0f0' : item.color },
        ]}
      >
        {item.emoji && <Text style={styles.swatchEmoji}>{item.emoji}</Text>}
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{item.name}</Text>
        <Text style={styles.rowStatus}>
          {equipped ? '장착됨' : owned ? '보유중 (탭하여 장착)' : `${item.price} 코인`}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  coins: { fontSize: 15, fontWeight: '700', color: '#444', padding: 16, paddingBottom: 8 },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#eee',
  },
  tabActive: { backgroundColor: '#222' },
  tabText: { fontSize: 13, color: '#555', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
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
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchEmoji: { fontSize: 22 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#222' },
  rowStatus: { fontSize: 12, color: '#888', marginTop: 2 },
});
