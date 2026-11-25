// Drawn by scripts/assets/draw-visit-ui.js (code, not Gemini).
export const VISIT_PANEL = require('./visit/panel.png');
export const VISIT_CARDS = [require('./visit/card-a.png'), require('./visit/card-b.png')];
// The opening, in the order it plays (scripts/assets/build-hospital-sheets.js).
export const VISIT_OPENING = [require('./visit/op-hand.jpg'), require('./visit/op-desk.jpg'), require('./visit/op-hospital.jpg')];
// Ballpoint scribbles over her notebook's later pages, light to heavy.
export const VISIT_SCRIBBLES = [require('./visit/scribble-a.png'), require('./visit/scribble-b.png'), require('./visit/scribble-c.png')];
// v0.98: comic panels (scripts/assets/build-comics.js): her memories as she goes on after each film, one panel to a
// line, and the happy ending in colour. Not preloaded: each is shown well after the screen before it has loaded it.
export const VISIT_MEMORY_COMICS = {
  collar: [require('./visit/comics/mono-collar-2.jpg'), require('./visit/comics/mono-collar-3.jpg'), require('./visit/comics/mono-collar-1.jpg')],
  snack: [require('./visit/comics/mono-snack-2.jpg'), require('./visit/comics/mono-snack-3.jpg'), require('./visit/comics/mono-snack-1.jpg')],
  laces: [require('./visit/comics/mono-laces-1.jpg'), require('./visit/comics/mono-laces-3.jpg'), require('./visit/comics/mono-laces-2.jpg')],
  coupon: [require('./visit/comics/mono-coupon-2.jpg'), require('./visit/comics/mono-coupon-1.jpg'), require('./visit/comics/mono-coupon-3.jpg')],
} as const;
export const VISIT_END_COMICS = {
  cry: require('./visit/comics/end-cry.jpg'),
  doctor: require('./visit/comics/end-doctor.jpg'),
  discharge: require('./visit/comics/end-discharge.jpg'),
} as const;
// v0.98: the title once the happy ending has been seen: her room in colour, the bed empty, the window open on the ginkgo
export const VISIT_TITLE_AFTER = require('./visit/comics/title-after.jpg');
