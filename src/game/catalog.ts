import type { ImageSourcePropType } from 'react-native';
import type { SpriteSheetSpec } from '../components/SpriteSheetAnimator';

export type SlotId = 'body' | 'outfit';

export type ShopItem = {
  id: string;
  slot: SlotId;
  name: string;
  price: number;
  color: string;
  emoji?: string;
  /** Static image. Takes priority over color/emoji. */
  image?: ImageSourcePropType;
  /** Animated sprite sheet (e.g. a character part that breathes/idles). Takes priority over image/color/emoji. */
  sprite?: SpriteSheetSpec;
};

export const SLOT_ORDER: SlotId[] = ['body', 'outfit'];

export const SLOT_LABELS: Record<SlotId, string> = {
  body: '캐릭터',
  outfit: '옷',
};

// Add new items here to expand character parts — no other code changes needed.
export const SHOP_ITEMS: ShopItem[] = [
  { id: 'body-default', slot: 'body', name: '기본', price: 0, color: '#ffe0b2' },
  { id: 'body-peach', slot: 'body', name: '복숭아', price: 20, color: '#ffccbc' },
  { id: 'body-mint', slot: 'body', name: '민트', price: 20, color: '#b2f2e0' },

  { id: 'outfit-none', slot: 'outfit', name: '없음', price: 0, color: 'transparent' },
  { id: 'outfit-blue', slot: 'outfit', name: '파란 옷', price: 25, color: '#4a90d9' },
  { id: 'outfit-red', slot: 'outfit', name: '빨간 옷', price: 25, color: '#e05a5a' },
  { id: 'outfit-yellow', slot: 'outfit', name: '노란 옷', price: 25, color: '#f2c94c' },
];

// Precomputed once at module load (not per render) — grouping and lookup are O(1) at use time.
export const ITEMS_BY_SLOT: Record<SlotId, ShopItem[]> = SLOT_ORDER.reduce((acc, slot) => {
  acc[slot] = SHOP_ITEMS.filter((item) => item.slot === slot);
  return acc;
}, {} as Record<SlotId, ShopItem[]>);

export const ITEM_MAP: Record<string, ShopItem> = SHOP_ITEMS.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {} as Record<string, ShopItem>);

export const DEFAULT_EQUIPPED: Record<SlotId, string> = {
  body: 'body-default',
  outfit: 'outfit-none',
};
