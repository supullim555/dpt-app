import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ShopScreenProps } from '../navigation/types';
import ScreenHeader from '../components/ScreenHeader';
import CoinBadge from '../components/CoinBadge';
import { CATEGORY_LABELS, CATEGORY_ORDER, SHOP_ITEMS, type ShopCategory, type ShopItem } from '../game/catalog';
import { useGame } from '../game/GameContext';
import { BORDER, INK, SCREEN_BG } from '../theme';

type Filter = 'all' | ShopCategory;

// The shop sells the room's furniture: buying a piece puts it in the room. Nothing here
// pushes the player to buy (§4) — no badges, no "new", no countdowns; it's just a quiet list.
//
// Split into category tabs (소품/가구) rather than one long list: Animal Crossing: Pocket
// Camp's decorating shop is a cited example of this going wrong once the item count grows —
// no theme grouping, just an ever-longer scroll. Nine items don't need it yet, but the room
// is meant to keep growing (§12), so the tabs are here before that becomes a problem.
export default function ShopScreen(_props: ShopScreenProps) {
  const { state, purchaseItem } = useGame();
  const [filter, setFilter] = useState<Filter>('all');

  const items = useMemo(
    () => (filter === 'all' ? SHOP_ITEMS : SHOP_ITEMS.filter((i) => i.category === filter)),
    [filter]
  );
  const handlePress = useCallback((item: ShopItem) => purchaseItem(item.id), [purchaseItem]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="상점" right={<CoinBadge coins={state.coins} />} />
      <View style={styles.tabs}>
        {(['all', ...CATEGORY_ORDER] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.tab, filter === f && styles.tabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.tabText, filter === f && styles.tabTextActive]}>
              {f === 'all' ? '전체' : CATEGORY_LABELS[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={items}
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
  container: { flex: 1, backgroundColor: SCREEN_BG },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: '#eee' },
  tabActive: { backgroundColor: INK },
  tabText: { fontSize: 13, color: '#555', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  listContent: { paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
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
  rowName: { fontSize: 15, fontWeight: '600', color: INK },
  rowStatus: { fontSize: 12, color: '#888', marginTop: 2 },
});
