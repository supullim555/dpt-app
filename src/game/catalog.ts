export type SlotId = 'background' | 'body' | 'outfit' | 'accessory';

export type ShopItem = {
  id: string;
  slot: SlotId;
  name: string;
  price: number;
  color: string;
  emoji?: string;
};

export const SLOT_ORDER: SlotId[] = ['background', 'body', 'outfit', 'accessory'];

export const SLOT_LABELS: Record<SlotId, string> = {
  background: '배경',
  body: '캐릭터',
  outfit: '옷',
  accessory: '액세서리',
};

// Add new items here to expand backgrounds/character parts — no other code changes needed.
export const SHOP_ITEMS: ShopItem[] = [
  { id: 'bg-sky', slot: 'background', name: '맑은 하늘', price: 0, color: '#bfe3ff' },
  { id: 'bg-sunset', slot: 'background', name: '노을', price: 30, color: '#ffb37a' },
  { id: 'bg-forest', slot: 'background', name: '숲', price: 30, color: '#bfe3c0' },
  { id: 'bg-night', slot: 'background', name: '밤하늘', price: 50, color: '#3a3a6a' },

  { id: 'body-default', slot: 'body', name: '기본', price: 0, color: '#ffe0b2' },
  { id: 'body-peach', slot: 'body', name: '복숭아', price: 20, color: '#ffccbc' },
  { id: 'body-mint', slot: 'body', name: '민트', price: 20, color: '#b2f2e0' },

  { id: 'outfit-none', slot: 'outfit', name: '없음', price: 0, color: 'transparent' },
  { id: 'outfit-blue', slot: 'outfit', name: '파란 옷', price: 25, color: '#4a90d9' },
  { id: 'outfit-red', slot: 'outfit', name: '빨간 옷', price: 25, color: '#e05a5a' },
  { id: 'outfit-yellow', slot: 'outfit', name: '노란 옷', price: 25, color: '#f2c94c' },

  { id: 'acc-none', slot: 'accessory', name: '없음', price: 0, color: 'transparent' },
  { id: 'acc-hat', slot: 'accessory', name: '모자', price: 15, color: 'transparent', emoji: '🎩' },
  { id: 'acc-glasses', slot: 'accessory', name: '안경', price: 15, color: 'transparent', emoji: '👓' },
  { id: 'acc-bow', slot: 'accessory', name: '리본', price: 15, color: 'transparent', emoji: '🎀' },
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
  background: 'bg-sky',
  body: 'body-default',
  outfit: 'outfit-none',
  accessory: 'acc-none',
};
