import type { ImageSourcePropType } from 'react-native';

// What's in the room and where. Each piece is its own image (generated with
// Gemini, cut out by scripts/extract-room.js), so filling the room is a matter
// of adding a line here — sizes come from the artwork's own proportions and
// blocking areas from `footDepth`, nothing else to keep in sync.
//
// kinds:
//   wall  — hangs on the back wall; `y` is its TOP edge.
//   flat  — lies on the floor (rug, cushion): drawn under everything, walkable.
//   solid — stands on the floor; `y` is where its base touches the floor. She
//           walks around it and passes in front of / behind it by depth.
export type RoomObjectKind = 'wall' | 'flat' | 'solid';

export type RoomObjectDef = {
  id: string;
  source: ImageSourcePropType;
  kind: RoomObjectKind;
  /** Horizontal center, as a fraction of room width. */
  x: number;
  /** Vertical anchor, as a fraction of room height (see kinds above). */
  y: number;
  /** Width as a fraction of room width; height follows the artwork's aspect. */
  w: number;
  /** solid only: depth of the floor contact (fraction of room height) that blocks her. */
  footDepth?: number;
  /** solid only: fraction of the image width that's solid at the base (default 0.9). */
  footWidth?: number;
  /**
   * Set = sold in the shop (and absent from the room until bought). Unset = part of the
   * starting room. Prices are in coins; a day of check-in plus a few practices earns ~10 each.
   * `category` groups the shop list into tabs — small pieces vs. big furniture — so browsing
   * doesn't turn into one long scroll as more pieces are added (a problem Animal Crossing:
   * Pocket Camp's decorating UI runs into once the item list grows).
   */
  shop?: { name: string; price: number; category: 'decor' | 'furniture' };
};

// Drawn in this order, so wall pieces sit under floor pieces and the rug
// under the cushion. Solids are re-layered by depth at runtime.
//
// The starting room is what has no `shop`: window, frames, rug, bed, nightstand.
// Everything else is bought with coins, one piece at a time, and appears in the room.
export const ROOM_OBJECTS: RoomObjectDef[] = [
  // back wall
  { id: 'wall_frames', source: require('../assets/room/wall_frames.png'), kind: 'wall', x: 0.22, y: 0.07, w: 0.26 },
  { id: 'window', source: require('../assets/room/window.png'), kind: 'wall', x: 0.6, y: 0.04, w: 0.28 },

  // on the floor
  { id: 'rug', source: require('../assets/room/rug.png'), kind: 'flat', x: 0.52, y: 0.83, w: 0.6 },
  { id: 'cushion', source: require('../assets/room/cushion.png'), kind: 'flat', x: 0.52, y: 0.76, w: 0.15, shop: { name: '바닥 쿠션', price: 20, category: 'decor' } },

  // standing against the back wall
  { id: 'bed', source: require('../assets/room/bed.png'), kind: 'solid', x: 0.22, y: 0.52, w: 0.38, footDepth: 0.1 },
  { id: 'nightstand', source: require('../assets/room/nightstand.png'), kind: 'solid', x: 0.48, y: 0.43, w: 0.13, footDepth: 0.03 },
  { id: 'wardrobe', source: require('../assets/room/wardrobe.png'), kind: 'solid', x: 0.64, y: 0.41, w: 0.21, footDepth: 0.03, shop: { name: '옷장', price: 50, category: 'furniture' } },
  { id: 'bookshelf', source: require('../assets/room/bookshelf.png'), kind: 'solid', x: 0.865, y: 0.41, w: 0.2, footDepth: 0.03, shop: { name: '책장', price: 40, category: 'furniture' } },

  // out in the room
  { id: 'desk_set', source: require('../assets/room/desk_set.png'), kind: 'solid', x: 0.8, y: 0.72, w: 0.28, footDepth: 0.04, shop: { name: '책상 세트', price: 60, category: 'furniture' } },
  { id: 'basket', source: require('../assets/room/basket.png'), kind: 'solid', x: 0.13, y: 0.68, w: 0.17, footDepth: 0.03, shop: { name: '바구니', price: 20, category: 'decor' } },
  { id: 'book_stack', source: require('../assets/room/book_stack.png'), kind: 'solid', x: 0.29, y: 0.6, w: 0.09, footDepth: 0.025, shop: { name: '책 더미', price: 20, category: 'decor' } },
  { id: 'teddy_bear', source: require('../assets/room/teddy_bear.png'), kind: 'solid', x: 0.4, y: 0.64, w: 0.13, footDepth: 0.03, footWidth: 0.7, shop: { name: '곰인형', price: 30, category: 'decor' } },
  { id: 'plant', source: require('../assets/room/plant.png'), kind: 'solid', x: 0.09, y: 0.93, w: 0.17, footDepth: 0.035, footWidth: 0.6, shop: { name: '화분', price: 20, category: 'decor' } },
  { id: 'standing_lamp', source: require('../assets/room/standing_lamp.png'), kind: 'solid', x: 0.95, y: 0.94, w: 0.09, footDepth: 0.02, footWidth: 0.5, shop: { name: '스탠드 조명', price: 30, category: 'decor' } },
];

export const FLOOR_SOURCE = require('../assets/room/floor.png');
export const WALLPAPER_SOURCE = require('../assets/room/wallpaper.png');
