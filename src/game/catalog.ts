import type { ImageSourcePropType } from 'react-native';
import { ROOM_OBJECTS } from '../room/objects';

export type ShopCategory = 'decor' | 'furniture';

export type ShopItem = {
  /** Same id as the room object it puts in the room. */
  id: string;
  name: string;
  price: number;
  image: ImageSourcePropType;
  category: ShopCategory;
};

export const CATEGORY_LABELS: Record<ShopCategory, string> = {
  decor: '소품',
  furniture: '가구',
};
// Tab order, '전체' (all) first.
export const CATEGORY_ORDER: ShopCategory[] = ['decor', 'furniture'];

// The shop sells the room: every object in the room list that has a `shop` entry
// (src/room/objects.ts). Adding a furniture piece there adds it here — nothing else to keep in sync.
export const SHOP_ITEMS: ShopItem[] = ROOM_OBJECTS.flatMap((o) =>
  o.shop ? [{ id: o.id, name: o.shop.name, price: o.shop.price, image: o.source, category: o.shop.category }] : []
).sort((a, b) => a.price - b.price);

export const ITEM_MAP: Record<string, ShopItem> = SHOP_ITEMS.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {} as Record<string, ShopItem>);
