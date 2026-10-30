import type { ImageSourcePropType } from 'react-native';

// What's in the room and where. Each piece is its own image (generated with
// Gemini, cut out by scripts/assets/extract-room.js), so filling the room is a matter
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
   * true = not in the starting room; appears once it's in ProgressState.roomItems. Until v0.28
   * these were bought in the shop; the story's chapters are meant to grant them instead (§40:
   * the room changes as the week's story goes on).
   */
  later?: true;
};

// Drawn in this order, so wall pieces sit under floor pieces and the rug
// under the cushion. Solids are re-layered by depth at runtime.
//
// The starting room is what isn't `later`: window, frames, rug, bed, nightstand.
export const ROOM_OBJECTS: RoomObjectDef[] = [
  // back wall
  { id: 'wall_frames', source: require('../../assets/room/wall_frames.png'), kind: 'wall', x: 0.22, y: 0.07, w: 0.26 },
  { id: 'window', source: require('../../assets/room/window.png'), kind: 'wall', x: 0.6, y: 0.04, w: 0.28 },

  // on the floor
  { id: 'rug', source: require('../../assets/room/rug.png'), kind: 'flat', x: 0.52, y: 0.83, w: 0.6 },
  { id: 'cushion', source: require('../../assets/room/cushion.png'), kind: 'flat', x: 0.52, y: 0.76, w: 0.15, later: true },

  // standing against the back wall
  { id: 'bed', source: require('../../assets/room/bed.png'), kind: 'solid', x: 0.22, y: 0.52, w: 0.38, footDepth: 0.1 },
  { id: 'nightstand', source: require('../../assets/room/nightstand.png'), kind: 'solid', x: 0.48, y: 0.43, w: 0.13, footDepth: 0.03 },
  { id: 'wardrobe', source: require('../../assets/room/wardrobe.png'), kind: 'solid', x: 0.64, y: 0.41, w: 0.21, footDepth: 0.03, later: true },
  { id: 'bookshelf', source: require('../../assets/room/bookshelf.png'), kind: 'solid', x: 0.865, y: 0.41, w: 0.2, footDepth: 0.03, later: true },

  // out in the room
  { id: 'desk_set', source: require('../../assets/room/desk_set.png'), kind: 'solid', x: 0.8, y: 0.72, w: 0.28, footDepth: 0.04, later: true },
  { id: 'basket', source: require('../../assets/room/basket.png'), kind: 'solid', x: 0.13, y: 0.68, w: 0.17, footDepth: 0.03, later: true },
  { id: 'book_stack', source: require('../../assets/room/book_stack.png'), kind: 'solid', x: 0.29, y: 0.6, w: 0.09, footDepth: 0.025, later: true },
  // Nudged to sit right at the bed's foot (its right edge is ~x:0.41) rather than floating
  // alone in open floor — a stuffed animal reads as "placed" when it's touching the bed it
  // belongs to, not scattered in the middle of the room.
  { id: 'teddy_bear', source: require('../../assets/room/teddy_bear.png'), kind: 'solid', x: 0.37, y: 0.58, w: 0.13, footDepth: 0.03, footWidth: 0.7, later: true },
  { id: 'plant', source: require('../../assets/room/plant.png'), kind: 'solid', x: 0.09, y: 0.93, w: 0.17, footDepth: 0.035, footWidth: 0.6, later: true },
  { id: 'standing_lamp', source: require('../../assets/room/standing_lamp.png'), kind: 'solid', x: 0.95, y: 0.94, w: 0.09, footDepth: 0.02, footWidth: 0.5, later: true },
];

export const FLOOR_SOURCE = require('../../assets/room/floor.png');
export const WALLPAPER_SOURCE = require('../../assets/room/wallpaper.png');
